const AWS = require('aws-sdk')
AWS.config.update({region:'ap-south-1'});
var s3 = new AWS.S3()
/* Deprecated Functions */
function uploadS3(obj, callback) {
    // console.log("Uploading...");
    
    s3.upload(obj, function (err, data){
      if(err) {
        console.log('s3 helper', err);
      } else {
        callback(data);
      }
    });
  }


function headObject(obj, callback) {
    console.log("Getting Metadata...");
    var params = {
      "Bucket" : "photorecog",
      "Key" : obj
    }
    s3.headObject(params, function(err, data) {
      if(err) {
        console.log(err);
      } else {
        callback(data);
      }
    });
  }

  module.exports.getMeta = headObject
  module.exports.uploadS3 = uploadS3
