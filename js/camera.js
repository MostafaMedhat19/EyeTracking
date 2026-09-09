export async function startCamera(video) {
  const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false});
  // Register the event before assigning srcObject. Otherwise a fast camera can
  // fire loadedmetadata between those two operations and leave startup waiting.
  const metadataReady = new Promise(resolve => video.addEventListener('loadedmetadata', resolve, {once:true}));
  video.srcObject=stream;
  if (video.readyState < HTMLMediaElement.HAVE_METADATA) await metadataReady;
  await video.play();
  return stream;
}
