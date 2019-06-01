const videoEl = $('#inputVideo').get(0)
const s3 = require('./src/js/s3helper')
const axios = require('axios')

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
          document.getElementById('err_msg').innerText = "Error in playing video"
          $('#error-div').removeClass('d-none')
          setTimeout(()=>{
            $('#not-detected-div').addClass('d-none')
            document.getElementById('err_msg').innerText = ""
          }, 2000)
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

  const setImageName = async ()=>{
    try {
    //   const storeId = await localStorage.getItem("storeId")
      const storeId = "THN003"
      let d = new Date()
      let year = d.getUTCFullYear().toString()
      let month = d.getUTCMonth() + 1
        if(month < 10){month = '0'+month.toString()}
        else{month = month.toString()}
      let date = d.getUTCDate().toString()
      let hours = d.getUTCHours()
      let minute = d.getUTCMinutes()
      let second = d.getUTCSeconds()
      return storeId.toString() + date + month + year + hours + minute + second
    } catch (error) {
      return false
    }
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

  const detectImage = async ()=>{
    const number_of_iterations = 10
    let i = 0
    while(i<number_of_iterations){
      try {
        const get_frame = await checkSingleFrame()
        return get_frame
      } catch (error) {
        // console.log(error)
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


const verify = async ()=>{

  const save_temp_data = async ()=>{
    const detectedImage = await detectImage()
    if(detectedImage){
      const fileName = await setImageName()
      localStorage.setItem('imageName', fileName)
      localStorage.setItem('imageData', detectedImage.imgData)
      $('#spinner').removeClass('d-none')
      return true
    }
    return false
  }

  const ec2_call = (p)=>{
    return new Promise((resolve, reject)=>{
      axios.post('http://ec2-13-234-136-115.ap-south-1.compute.amazonaws.com:3000/v0.01a/identify', p)
      .then((response)=>{
        resolve(response)
      }) .catch((err)=>{
        reject(err)
      })
      setTimeout(()=>{
        resolve(false)
      },3000)
    })
  }

  const saveTempData = await save_temp_data()
  if(saveTempData) {

    buf = new Buffer(localStorage.getItem("imageData").replace(/^data:image\/\w+;base64,/, ""),'base64')
    var params = {
      "Bucket":"photorecog",
      "Key": localStorage.getItem("imageName") + ".jpeg",
      "ContentType":'image/jpeg',
      "Body": buf,
      "ContentEncoding": 'base64',
      "ACL":"private"
    };
  
    var params2 = {
      "bucket":"photorecog",
      "photo": localStorage.getItem("imageName") + ".jpeg",
      "collectionId": "testCollection"
    };

    s3.uploadS3(params, (data, err)=>{
      if(err){
        document.getElementById('err_msg').innerText = "Error in Image Upload to Server"
        $('#not-detected-div').removeClass('d-none')
        setTimeout(()=>{
          $('#not-detected-div').addClass('d-none')
          document.getElementById('err_msg').innerText = ""
        }, 2000)
        console.log('error in upload s3', err)
      } else {
        ec2_call(params2)
          .then((res)=>{
            if(res === false){
              document.getElementById('err_msg').innerText = "Failed to connect server"
              $('#not-detected-div').removeClass('d-none')
              setTimeout(()=>{
                $('#not-detected-div').addClass('d-none')
                document.getElementById('err_msg').innerText = ""
                $('#spinner').addClass('d-none')
              }, 2000)
            }
            else if(response.data.found){
              document.getElementById('name').innerHTML = response.data.name
              document.getElementById('email').innerHTML = response.data.email
              document.getElementById('number').innerHTML = response.data.number
            } else{
              // detected face not registered
            }
          })
      }
    })

  } else {

  }
}



document.getElementById('ok-btn').addEventListener("click", (event)=>{
  event.preventDefault()
  buf = new Buffer(localStorage.getItem("imageData").replace(/^data:image\/\w+;base64,/, ""),'base64')
  let regParams = {
      "Bucket":"photorecog",
      "Key": localStorage.getItem("imageName") + ".jpeg",
      "ContentType":'image/jpeg',
      "Body": buf,
      "ContentEncoding": 'base64',
      "ACL":"private",
      "Metadata": {
        "name": $('#inputName').val(),
        "number": $('#inputNumber').val(),
        "email": $('#inputEmail').val(),
        "storeId": localStorage.getItem("storeId")
      }
  }

  let regParams2 = {
    "bucket":"photorecog",
    "photo": localStorage.getItem("imageName") + ".jpeg",
    "collectionId": "testCollection"
  }

  const ec2_call = (p)=>{
    return new Promise((resolve, reject)=>{
      axios.post('http://ec2-13-234-136-115.ap-south-1.compute.amazonaws.com:3000/v0.01a/registerUser', p)
      .then((response)=>{
        resolve(response)
      }) .catch((err)=>{
        reject(err)
      })
      setTimeout(()=>{
        resolve(false)
      },3000)
    })
  }

  let name = $('#inputName').val()
  let email = $('#inputEmail').val()
  let number = $('#inputNumber').val()
  if(name == "" || email == "" || number == ""){
    console.log("please fill all the details")
  } else {
    
  }


})