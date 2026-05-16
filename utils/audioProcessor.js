const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const http = require('http');
const https = require('https');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

// Map output extensions to ffmpeg format and codec settings
function applyFormatForExtension(command, outExt) {
    switch (outExt) {
        case '.mp3':
            command.toFormat('mp3').audioCodec('libmp3lame').audioBitrate(128);
            break;
        case '.aac':
            // ADTS container for raw AAC
            command.toFormat('adts').audioCodec('aac');
            break;
        case '.m4a':
            // M4A is MP4 container with AAC
            command.toFormat('mp4').audioCodec('aac');
            break;
        case '.wav':
            command.toFormat('wav').audioCodec('pcm_s16le');
            break;
        case '.amr':
            // AMR Narrowband
            try {
                command.toFormat('amr').audioCodec('libopencore_amrnb');
            } catch (e) {
                command.toFormat('amr');
            }
            break;
        default:
            // leave defaults to ffmpeg
            break;
    }
}

// Detect the correct FFmpeg path
function getFfmpegPath() {
    // Check if running on Render (Linux) - use system ffmpeg
    if (process.env.RENDER || process.platform === 'linux') {
        try {
            // Try to find system ffmpeg
            const systemFfmpeg = execSync('which ffmpeg', { encoding: 'utf8' }).trim();
            console.log('Using system FFmpeg:', systemFfmpeg);
            return systemFfmpeg;
        } catch (e) {
            console.log('System ffmpeg not found, trying ffmpeg-static');
        }
    }
    
    // Use ffmpeg-static as fallback
    try {
        const ffmpegStatic = require('ffmpeg-static');
        console.log('Using ffmpeg-static:', ffmpegStatic);
        return ffmpegStatic;
    } catch (e) {
        console.error('FFmpeg not found!');
        throw new Error('FFmpeg not found. Please install FFmpeg.');
    }
}

function getFfprobePath() {
    // Check if running on Render (Linux) - use system ffprobe
    if (process.env.RENDER || process.platform === 'linux') {
        try {
            // Try to find system ffprobe
            const systemFfprobe = execSync('which ffprobe', { encoding: 'utf8' }).trim();
            console.log('Using system ffprobe:', systemFfprobe);
            return systemFfprobe;
        } catch (e) {
            console.log('System ffprobe not found, trying ffprobe-static');
        }
    }
    
    // Use ffprobe-static as fallback
    try {
        const ffprobeStatic = require('ffprobe-static');
        console.log('Using ffprobe-static:', ffprobeStatic.path);
        return ffprobeStatic.path;
    } catch (e) {
        console.error('ffprobe not found!');
        throw new Error('ffprobe not found. Please install FFmpeg.');
    }
}

// Set the paths for ffmpeg and ffprobe
const ffmpegPath = getFfmpegPath();
const ffprobePath = getFfprobePath();

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

class AudioProcessor {
    static async cutAudio(inputUrl, startTime, endTime, outputPath) {
        return new Promise((resolve, reject) => {
            const outExt = path.extname(outputPath).toLowerCase();
            const command = ffmpeg(inputUrl).setStartTime(startTime).duration(endTime - startTime).output(outputPath);

            applyFormatForExtension(command, outExt);

            command
                .on('end', () => {
                    console.log('Audio cut successfully');
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    console.error('Error cutting audio:', err);
                    // Try a fallback: convert to mp3 instead
                    const fallbackPath = outputPath.replace(path.extname(outputPath), '.mp3');
                    console.log('Attempting fallback to MP3:', fallbackPath);
                    ffmpeg(inputUrl)
                        .setStartTime(startTime)
                        .duration(endTime - startTime)
                        .toFormat('mp3')
                        .audioCodec('libmp3lame')
                        .audioBitrate(128)
                        .output(fallbackPath)
                        .on('end', () => resolve(fallbackPath))
                        .on('error', (e2) => reject(e2))
                        .run();
                })
                .run();
        });
    }

    static async joinAudio(urls, outputPath) {
        return new Promise((resolve, reject) => {
            const command = ffmpeg();
            
            urls.forEach(url => {
                command.input(url);
            });
            const outExt = path.extname(outputPath).toLowerCase();
            applyFormatForExtension(command, outExt);

            command
                .on('end', () => {
                    console.log('Audio joined successfully');
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    console.error('Error joining audio:', err);
                    // Fallback: try merging to mp3
                    const fallbackPath = outputPath.replace(path.extname(outputPath), '.mp3');
                    console.log('Attempting fallback merge to MP3:', fallbackPath);
                    const fb = ffmpeg();
                    urls.forEach(u => fb.input(u));
                    fb.toFormat('mp3').audioCodec('libmp3lame').audioBitrate(128)
                        .on('end', () => resolve(fallbackPath))
                        .on('error', (e2) => reject(e2))
                        .mergeToFile(fallbackPath);
                })
                .mergeToFile(outputPath);
        });
    }

    static async getAudioDuration(url) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(url, async (err, metadata) => {
                if (!err && metadata && metadata.format && metadata.format.duration) {
                    return resolve(metadata.format.duration);
                }

                // If probing remote URL failed, try downloading to temp and probing locally
                try {
                    const tempDir = path.join(__dirname, '../temp');
                    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

                    const tmpPath = path.join(tempDir, `probe-${Date.now()}${path.extname(url.split('?')[0]) || ''}`);

                    const client = url.startsWith('https') ? https : http;
                    const request = client.get(url, (response) => {
                        if (response.statusCode >= 400) {
                            return reject(new Error(`Failed to download file for probing: ${response.statusCode}`));
                        }
                        streamPipeline(response, fs.createWriteStream(tmpPath)).then(() => {
                            ffmpeg.ffprobe(tmpPath, (e2, meta2) => {
                                // cleanup
                                try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (ex) {}
                                if (e2) return reject(e2);
                                if (meta2 && meta2.format && meta2.format.duration) return resolve(meta2.format.duration);
                                return reject(new Error('Could not determine duration after local probe'));
                            });
                        }).catch(dlErr => {
                            try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (ex) {}
                            reject(dlErr);
                        });
                    });
                    request.on('error', (reqErr) => {
                        reject(reqErr);
                    });
                } catch (ex) {
                    reject(err || ex);
                }
            });
        });
    }

    static async convertToMp3(inputUrl, outputPath) {
        return new Promise((resolve, reject) => {
            ffmpeg(inputUrl)
                .toFormat('mp3')
                .audioCodec('libmp3lame')
                .audioBitrate(128)
                .output(outputPath)
                .on('end', () => {
                    console.log('Audio converted to MP3 successfully');
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    console.error('Error converting to MP3:', err);
                    reject(err);
                })
                .run();
        });
    }

    static cleanup(filePath) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}

module.exports = AudioProcessor;
