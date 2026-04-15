const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static');
const path = require('path');
const fs = require('fs');

// Set the paths for ffmpeg and ffprobe
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

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
