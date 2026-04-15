const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

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
            ffmpeg(inputUrl)
                .setStartTime(startTime)
                .duration(endTime - startTime)
                .output(outputPath)
                .on('end', () => {
                    console.log('Audio cut successfully');
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    console.error('Error cutting audio:', err);
                    reject(err);
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

            command
                .on('end', () => {
                    console.log('Audio joined successfully');
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    console.error('Error joining audio:', err);
                    reject(err);
                })
                .mergeToFile(outputPath);
        });
    }

    static async getAudioDuration(url) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(url, (err, metadata) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(metadata.format.duration);
                }
            });
        });
    }

    static cleanup(filePath) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}

module.exports = AudioProcessor;
