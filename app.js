const { app, BrowserWindow, Menu, MenuItem, globalShortcut } = require('electron')
const path = require('path')
const faceapi =  require('./src/ML-API/dist/face-api.js')
let mainWindow = null

// console.log(faceapi.nets.tinyFaceDetector.load)
const debug = /--debug/.test(process.argv[2])

if (process.mas) app.setName('Face Attendance')

// load all models in main process
// Promise.all([
//     faceapi.nets.tinyFaceDetector.loadFromDisk('./src/ML-Api/weights/')
//   ]).then(()=>{
//     console.log('loaded')
//   }).catch((err)=>{
//       console.log('error in loading models')
//   })

// Make this app a single instance app.
// The main window will be restored and focused instead of a second window
// opened when a person attempts to launch a second instance.
// Returns true if the current version of the app should quit instead of launching.
function makeSingleInstance () {
    if (process.mas) return
    app.requestSingleInstanceLock()
  
    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
      }
    })
  }

// Require each JS file in the main-process dir
// function loadDemos () {
//     const files = glob.sync(path.join(__dirname, 'main-process/**/*.js'))
//     files.forEach((file) => { require(file) })
//   }


function initialize () {
    makeSingleInstance()
    // loadDemos()
  
    function createWindow () {
      const windowOptions = {
        x:0,
        y:0,
        width: 1580,
        minWidth: 680,
        height: 1000,
        title: "FaceSure",
        icon: "./img/Augle-Icon.png",
        fullscreen: true,
        webPreferences: {
          nodeIntegration: true
        }
      }
  
      if (process.platform === 'linux') {
        // windowOptions.icon = path.join(__dirname, '/assets/app-icon/png/512.png')
      }
  
      mainWindow = new BrowserWindow(windowOptions)
      mainWindow.loadURL(path.join('file://', __dirname, 'index.html'))
      mainWindow.maximize()
  
      // Launch fullscreen with DevTools open, usage: npm run debug
      if (debug) {
        mainWindow.webContents.openDevTools()
        mainWindow.maximize()
        // require('devtron').install()
      }
  
      mainWindow.on('closed', () => {
        mainWindow = null
      })
    }
  
    app.on('ready', () => {
      createWindow()
      const template = []
    
      const menu = Menu.buildFromTemplate(template);
      Menu.setApplicationMenu(menu);
    })
  
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })
  
    app.on('activate', () => {
      if (mainWindow === null) {
        createWindow()
      }
    })
  }

  initialize()
  

