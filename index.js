const videoEl = $('#inputVideo').get(0)
const s3 = require('./src/js/s3helper')
const axios = require('axios')
let status = false
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
    //
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

$(document).ready(()=>{
  localStorage.clear()
})

const onPlay =  async ()=> {
    if(videoEl.paused || videoEl.ended || !isFaceDetectionModelLoaded())
      return setTimeout(() => onPlay())

    const options = getFaceDetectorOptions()
    const result = await faceapi.detectSingleFace(videoEl, options)
    if (result) { 
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
  const canvas = document.createElement('canvas')
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    canvas.getContext('2d').drawImage(videoEl, 0, 0)
  let temp_img = document.createElement('img')
    temp_img.src = canvas.toDataURL('image/jpeg')
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

const setImageName = ()=>{
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
    const image_name = storeId.toString() + date + month + year + hours + minute + second
    return image_name
}

const getTime = ()=>{
  let d = new Date()

  let month = d.getMonth() + 1
      if(month < 10){month = '0'+month.toString()}
      else{month = month.toString()}
  let year = d.getFullYear().toString()
  let date = d.getDate()
      if(date < 10){date = '0'+date.toString()}
      else{date = date.toString()}
  let hours = d.getHours()
      if(hours < 10){hours = '0'+hours.toString()}
      else{hours = hours.toString()}
  let minute = d.getMinutes()
      if(minute < 10){minute = '0'+minute.toString()}
      else{minute = minute.toString()}
  return hours + ":" + minute + " " + date + "/" + month + "/" + year
}




const detectFace = async ()=>{ console.log('detect face function started')
  if(videoEl.paused || videoEl.ended || !isFaceDetectionModelLoaded()){return setTimeout(() => detectFace())}
      
  const options = getFaceDetectorOptions()
  const result = await faceapi.detectSingleFace(videoEl, options)

  const ec2_call = (p)=>{
    return new Promise((resolve, reject)=>{
      axios.post('http://ec2-13-233-55-82.ap-south-1.compute.amazonaws.com:3000/v0.01a/identify', p)
      .then((response)=>{
        resolve(response)
      }) .catch((err)=>{
        reject(err)
      })
      setTimeout(()=>{
        resolve(false)
      },30000)
    })
  }

  if (result && result.box.width > 330) {
    try {
      const single_frame_result = await checkSingleFrame()
      const image = single_frame_result.imgData
      const imageName = setImageName()
      $('#main-home').addClass('d-none')
      $('#spinner').removeClass('d-none')
      buf = new Buffer(image.replace(/^data:image\/\w+;base64,/, ""),'base64')
      var params = { "Bucket":"photorecog", "Key": imageName + ".jpeg", "ContentType":'image/jpeg', "Body": buf, "ContentEncoding": 'base64', "ACL":"private" }
      var params2 = { "bucket":"photorecog", "photo": imageName + ".jpeg", "collectionId": "testCollection" }
      s3.uploadS3(params, async (data, err)=>{ 
        if(err){
          document.getElementById('err_msg').innerText = "Error in Image Upload to Server"
          $('#not-detected-div').removeClass('d-none')
          setTimeout(()=>{
            $('#not-detected-div').addClass('d-none')
            document.getElementById('err_msg').innerText = ""
          }, 2000)
          console.log('error in upload s3', err)
            $('#spinner').addClass('d-none')
            console.log('one set done from error in upload to s3')
            setTimeout(() => detectFace())
        } else {
          try {
            const ec2_result = await ec2_call(params2)
            console.log(ec2_result)
            if(ec2_result){ console.log('data found')
              if(ec2_result.data.found){
                const time = getTime()
                $('#spinner').addClass('d-none') 
                $('#att_info').removeClass('d-none')
                document.getElementById('name').innerHTML = ec2_result.data.name
                document.getElementById('time').innerHTML = time
                await clearInfo()
                console.log('all things are ok')
                $('#main-home').removeClass('d-none')
                setTimeout(() => detectFace())
              } else {
                $('#spinner').addClass('d-none')
                $('#err_info').removeClass('d-none')
                await clearErrInfo()
                $('#main-home').removeClass('d-none')
                setTimeout(() => detectFace())
              } 
            } else{
              $('#not-detected-div').removeClass('d-none')
              document.getElementById('err_msg').innerText = "Failed to connect server"
              setTimeout(()=>{
                document.getElementById('err_msg').innerText = ""
                $('#not-detected-div').addClass('d-none')
              }, 2000)
              $('#spinner').addClass('d-none')
              console.log('one set done from user not registered')
              setTimeout(() => detectFace())
            }
          } catch (error) {
            console.log(error)
              $('#spinner').addClass('d-none')
              console.log('one set done from ec2_result catch')
              setTimeout(() => detectFace())
          }
        }
      })
    } catch (error) {
      console.log(error)
      console.log('one set done from check_single_frame catch')
      setTimeout(() => detectFace())
    }
    } else {
      console.log('function running again from else block')
      setTimeout(() => detectFace())
    }
}

const clearInfo = () => {
  return new Promise((resolve, reject)=>{
    setTimeout(()=>{
      $('#att_info').addClass('d-none')
      document.getElementById('name').innerHTML = ''
      document.getElementById('time').innerHTML = ''
      resolve(true)
    }, 2500)
  })
}

const clearErrInfo = ()=>{
  return new Promise((resolve, reject)=>{
    setTimeout(()=>{
      $('#err_info').addClass('d-none')
      resolve(true)
    }, 2500)
  })
}























// const detectImage = async ()=>{
//   const number_of_iterations = 10
//   let i = 0
//   while(i<number_of_iterations){
//     try {
//       const get_frame = await checkSingleFrame()
//       return get_frame
//     } catch (error) {
//       console.log(error)
//       i++
//     } 
//   }
//   if(i === number_of_iterations){
//     document.getElementById('err_msg').innerText = "Image Not Detected"
//     $('#not-detected-div').removeClass('d-none')
//     setTimeout(()=>{
//       $('#not-detected-div').addClass('d-none')
//       document.getElementById('err_msg').innerText = ""
//     }, 2000)
//     return false
//   }
// }


// const verify = async ()=>{

//   const save_temp_data = async ()=>{
//     const detectedImage = await detectImage()
//     if(detectedImage){
//       const fileName = await setImageName()
//       localStorage.setItem('imageName', fileName)
//       localStorage.setItem('imageData', detectedImage.imgData)
//       $('#spinner').removeClass('d-none')
//       return true
//     }
//     return false
//   }

//   const ec2_call = (p)=>{
//     return new Promise((resolve, reject)=>{
//       axios.post('http://ec2-13-234-136-115.ap-south-1.compute.amazonaws.com:3000/v0.01a/identify', p)
//       .then((response)=>{
//         resolve(response)
//       }) .catch((err)=>{
//         reject(err)
//       })
//       setTimeout(()=>{
//         resolve(false)
//       },3000)
//     })
//   }

//   const saveTempData = await save_temp_data()
//   if(saveTempData){
//     buf = new Buffer(localStorage.getItem("imageData").replace(/^data:image\/\w+;base64,/, ""),'base64')
//       var params = { "Bucket":"photorecog", "Key": localStorage.getItem("imageName") + ".jpeg",
//                     "ContentType":'image/jpeg', "Body": buf, "ContentEncoding": 'base64', "ACL":"private" }
    
//       var params2 = { "bucket":"photorecog", "photo": localStorage.getItem("imageName") + ".jpeg", "collectionId": "testCollection" }
//   }

//     s3.uploadS3(params, (data, err)=>{ console.log(data)
//         if(err){
//           document.getElementById('err_msg').innerText = "Error in Image Upload to Server"
//           $('#not-detected-div').removeClass('d-none')
//           setTimeout(()=>{
//             $('#not-detected-div').addClass('d-none')
//             document.getElementById('err_msg').innerText = ""
//           }, 2000)
//           console.log('error in upload s3', err)
//         } else {
//           ec2_call(params2)
//             .then((res)=>{ console.log(res)
//               if(res === false){
//                 document.getElementById('err_msg').innerText = "Failed to connect server"
//                 $('#not-detected-div').removeClass('d-none')
//                 setTimeout(()=>{
//                   $('#not-detected-div').addClass('d-none')
//                   document.getElementById('err_msg').innerText = ""
//                   $('#spinner').addClass('d-none')
//                 }, 2000)
//               }
//               else if(res.data.found){
//                 $('#ver-img-main-div').removeClass = 'd-none'
//                 $('#attendance-info').removeClass = 'd-none'
//                 document.getElementById('name').innerHTML = res.data.name
//                 document.getElementById('email').innerHTML = res.data.email
//                 document.getElementById('number').innerHTML = res.data.number
//                 resolve(res)
//               } else {
//                 document.getElementById('err_msg').innerText = "You are not registered"
//                 $('#not-detected-div').removeClass('d-none')
//                 setTimeout(()=>{
//                   $('#not-detected-div').addClass('d-none')
//                   document.getElementById('err_msg').innerText = ""
//                   $('#spinner').addClass('d-none')
//                 }, 2000)
//               }
//             }) .catch((err)=>{
//               document.getElementById('err_msg').innerText = "Failed to connect server"
//               $('#not-detected-div').removeClass('d-none')
//               setTimeout(()=>{
//                 $('#not-detected-div').addClass('d-none')
//                 document.getElementById('err_msg').innerText = ""
//                 $('#spinner').addClass('d-none')
//               }, 2000)
//               console.log(err)
//             })
//         }
//       })
// }