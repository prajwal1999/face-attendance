const videoEl = $('#inputVideo').get(0)

faceapi.env.monkeyPatch({
    Canvas: HTMLCanvasElement,
    Image: HTMLImageElement,
    ImageData: ImageData,
    Video: HTMLVideoElement,
    createCanvasElement: () => document.createElement('canvas'),
    createImageElement: () => document.createElement('img')
})

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./src/ML-Api/weights/')
  ]).then(()=>{
    console.log('loaded')
  })

const startVideo = async()=>{
    navigator.getUserMedia(
        {video:{}},
        stream => {
          videoEl.srcObject = stream
        },
        err => {
        //   document.getElementById('err_msg').innerText = "Error in playing video"
        //   $('#error-div').removeClass('d-none')
        //   setTimeout(()=>{
        //     $('#not-detected-div').addClass('d-none')
        //     document.getElementById('err_msg').innerText = ""
        //   }, 2000)
        }
    )
  }
  
  startVideo()

  const onPlay =  async ()=> { 
    if(videoEl.paused || videoEl.ended || !isFaceDetectionModelLoaded())
      return setTimeout(() => onPlay())

    const options = getFaceDetectorOptions()
    const result = await faceapi.detectSingleFace(videoEl, options)
    if (result) {
        // console.log(result)
        const canvas = $('#overlay').get(0)
        const dims = faceapi.matchDimensions(canvas, videoEl, true)
        faceapi.draw.drawDetections(canvas, faceapi.resizeResults(result, dims))
    }
    else {
        // console.log('result is not available')
        const canvas = $('#overlay').get(0)
        faceapi.draw.drawDetections(canvas, null)
    } 
    setTimeout(() => onPlay())
  }

  const checkSingleFrame = async ()=>{
    const options = getFaceDetectorOptions()
    const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      canvas.getContext('2d').drawImage(videoEl, 0, 0);
    let temp_img = document.createElement('img');
      temp_img.src = canvas.toDataURL('image/jpeg');
    const image_result = await faceapi.detectSingleFace(temp_img, options)
    return new Promise((resolve, reject)=>{
      if(image_result){
        const _x = image_result.box['x']-image_result.box['width']/20
        const _y = image_result.box['y']-image_result.box['height']/20
        const _width = image_result.box['width']*1.1
        const _height = image_result.box['height']*1.1     
        let crop_canvas = document.createElement('canvas')
          crop_canvas.width = _width
          crop_canvas.height = _height
        let ctx = crop_canvas.getContext('2d')
          ctx.drawImage(temp_img, _x, _y, _width, _height, 0, 0, _width, _height)
        let croppedImgdata = crop_canvas.toDataURL('image/jpeg')
        const obj_to_return = {status: true, imgData: croppedImgdata}
        resolve(obj_to_return)
      } else{
        reject(false)
      }
    })
  }

  const detectImage = async ()=>{ console.log('called')
    const number_of_iterations = 10
    let i = 0
    while(i<number_of_iterations){
      try {
        const get_frame = await checkSingleFrame()
        console.log(get_frame.imgData)
        return get_frame
      } catch (error) {
        console.log(error)
        i++
      } 
    }
    if(i === number_of_iterations){
      document.getElementById('err_msg').innerText = "Image Not Detected"
      $('#not-detected-div').removeClass('d-none')
      setTimeout(()=>{
        $('#not-detected-div').addClass('d-none')
        document.getElementById('err_msg').innerText = ""
      }, 2000)
      return false
    }
  }