# face-attendance

* Starting point <b style="color:green">app.js</b> 

## app.js
* This file contains initializing of app.
* It has code for auto-update and <b style="color:red">createWindow</b> method
------

this is an single page application and all logic resides in <b style="color:green">index.js</b> file

## index.js

### Detailed doc and code for camera and face-detection is in this [repo](https://github.com/justadudewhohacks/face-api.js?files=1)

* This file has code to run camera and face detection.
* <b style="color:red">startVideo()</b> function is responsible for stream camera.
* <b style="color:red">onPlay()</b> function runs recursively to detect and detects faces and draw box around it.
* <b style="color:red">checkSingleFrame()</b>function runs asynchronusly. It checks single frame, detects image, crop it resolves it back as a promise.
* <b style="color:red">setImageName()</b> function runs asynchronusly to retreive get <b style="color:red">userData()</b> from device and sets imageName by adding time-stamp to it. eg: <b>storeId + date + month + year + hours + minute + second</b>
<b style="color:yellow">THN00323022019214154</b> .
* <b style="color:red">detectFace()</b> function is the most important in the script .
