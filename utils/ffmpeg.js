const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
ffmpeg.setFfmpegPath(ffmpegPath);

const path = require("path");

exports.cutAudio = (url, start, end) => {
    return new Promise((resolve) => {
        const output = path.join(__dirname, `cut_${Date.now()}.mp3`);

        ffmpeg(url)
        .setStartTime(start)
        .setDuration(end - start)
        .output(output)
        .on("end", () => resolve(output))
        .run();
    });
};

exports.mergeAudios = (urls) => {
    return new Promise((resolve) => {
        const output = path.join(__dirname, `merge_${Date.now()}.mp3`);
        let command = ffmpeg();

        urls.forEach(url => command.input(url));

        command
        .on("end", () => resolve(output))
        .mergeToFile(output);
    });
};
