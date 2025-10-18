import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export const loadFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg && ffmpeg.loaded) {
    return ffmpeg;
  }

  ffmpeg = new FFmpeg();

  ffmpeg.on('log', ({ message }) => {
    console.log(message); // For debugging FFmpeg logs
  });

  const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm';

  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
    });
    console.log('FFmpeg loaded successfully!');
    return ffmpeg;
  } catch (error) {
    console.error('Failed to load FFmpeg:', error);
    ffmpeg = null; // Reset on failure
    throw new Error('Could not load FFmpeg. Video assembly is not available.');
  }
};

export const assembleVideo = async (
  base64Images: string[],
  base64Audio: string,
  imageDuration: number = 3
): Promise<string> => {
    const ffmpegInstance = await loadFFmpeg();

    try {
        // 1. Write images and audio to FFmpeg's virtual file system
        for (let i = 0; i < base64Images.length; i++) {
            const imageData = await fetchFile(`data:image/jpeg;base64,${base64Images[i]}`);
            await ffmpegInstance.writeFile(`img${i}.jpg`, imageData);
        }
        const audioData = await fetchFile(`data:audio/mp3;base64,${base64Audio}`);
        await ffmpegInstance.writeFile('audio.mp3', audioData);

        // 2. Run the FFmpeg command
        // This command creates a slideshow from the images, sets the duration for each,
        // and merges it with the audio.
        await ffmpegInstance.exec([
            '-framerate', `1/${imageDuration}`,      // Each image lasts for `imageDuration` seconds
            '-i', 'img%d.jpg',                   // Input images pattern
            '-i', 'audio.mp3',                    // Input audio file
            '-c:v', 'libx264',                    // Video codec
            '-t', String(base64Images.length * imageDuration), // Total duration of the video
            '-pix_fmt', 'yuv420p',                // Pixel format for compatibility
            '-c:a', 'aac',                        // Audio codec
            '-strict', 'experimental',
            '-shortest',                          // Finish encoding when the shortest input stream ends (the audio)
            'output.mp4'                          // Output file name
        ]);

        // 3. Read the output file
        const data = await ffmpegInstance.readFile('output.mp4');

        // 4. Create a URL for the video
        const blob = new Blob([data], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);

        return url;

    } catch (error) {
        console.error('Error assembling video:', error);
        throw new Error('Failed to create the video.');
    } finally {
        // Clean up virtual files
        for (let i = 0; i < base64Images.length; i++) {
            try { await ffmpegInstance.deleteFile(`img${i}.jpg`); } catch (e) {}
        }
        try { await ffmpegInstance.deleteFile('audio.mp3'); } catch(e) {}
    }
};
