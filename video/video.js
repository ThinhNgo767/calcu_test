const file = document.getElementById("input-file");
const video = document.getElementById("video");
const next = document.getElementById("next");
const back = document.getElementById("back");
const playPause = document.getElementById("play-pause");
const again = document.getElementById("select-again");
const durationRange = document.getElementById("duration");

const controlButton = document.getElementById("container-control-btn");

const speedBox = document.getElementById("container-speed");

const speedList = speedBox.querySelectorAll("input");

let isPlay = false;

document.getElementById("btn-select").addEventListener("click", () => {
  file.click();
});

async function selectVideo(file) {
  if (!file) return;
  const thum = await generateThumbnail(file);

  const src = URL.createObjectURL(file);

  if (!thum) {
    alert("iOS không tạo được thumbnail");
    return;
  }
  const pic = URL.createObjectURL(thum);

  video.src = src;
  video.poster = pic;
  video.muted = true;
  video.playsInline = true;
  video.style.display = "block";
  controlButton.style.display = "flex";
  speedBox.style.display = "flex";
  document.getElementById("control-time").style.display = "flex";
}

function generateThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          resolve(blob);
          URL.revokeObjectURL(video.src);
        },
        "image/jpeg",
        0.9,
      );
    };

    video.onerror = () => resolve(null);
  });
}

file.addEventListener("change", async function () {
  let media = file.files[0];
  await selectVideo(media);
});

next.addEventListener("click", () => {
  if (video.currentTime + 0.1 >= video.duration) {
    video.currentTime = video.duration;
    return;
  }
  video.currentTime += 0.1;
});

back.addEventListener("click", () => {
  video.currentTime = Math.max(0, video.currentTime - 0.1);
});

playPause.addEventListener("click", () => {
  video.paused ? video.play() : video.pause();
});

// UI: Listen to the video to decide what the button says
video.addEventListener("play", () => {
  playPause.innerText = "Pause";
});

video.addEventListener("pause", () => {
  playPause.innerText = "Play";
});

video.addEventListener("timeupdate", () => {
  document.getElementById("current-time").innerText =
    video.currentTime.toFixed(1);
  document.getElementById("duration").max = video.duration;
  document.getElementById("duration").value = video.currentTime;
});

again.addEventListener("click", function () {
  URL.revokeObjectURL(video.src);
  URL.revokeObjectURL(video.poster);
  video.src = "";
  video.poster = "";
  file.value = "";
  video.style.display = "none";
  controlButton.style.display = "none";
  speedBox.style.display = "none";
  document.getElementById("control-time").style.display = "none";
});

durationRange.addEventListener("input", () => {
  video.currentTime = durationRange.value;
});

speedList.forEach((i) => {
  i.addEventListener("click", () => {
    video.playbackRate = i.value;
  });
});
