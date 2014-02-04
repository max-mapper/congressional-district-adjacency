GLOBAL = window // hack to make the JSTS module inside turf work
var turf = require('turf')
var request = require('browser-request')
var async = require('async')
var queue = async.queue(intersect, 1)
var intersections = window.intersections = {}

request('districts112.ldjson', function(err, resp, data) {
  var districts = data.split('\n').map(function(json) {
    if (json.length === 0) return
    var obj = JSON.parse(json)
    obj.geojson = JSON.parse(obj.geojson)
    return obj
   })
   window.districts = districts
   var num = districts.length
   var batchSize = 5
   var start = 0
   var end = batchSize
   
   addToQueue(start, end)
   
   queue.drain = function() {
     if (end === num) return console.log("Done", intersections)
     start += batchSize
     end += batchSize
     if (end > num) {
       end = num
     }
     addToQueue(start, end)
   }
   
   function addToQueue(start, end) {
     for (var a = start; a < end; a++) {
       for (var b = start; b < end; b++) {
         if (a === b) continue
         var districtA = districts[a]
         var districtB = districts[b]
         queue.push({A: districtA, B: districtB})
       }
     }
   }
})

function intersect(task, done) {
  turf.intersect(fc(task.A.geojson), fc(task.B.geojson), function(err, fc) {
    if (err) return done(err)
    var feature = fc.features[0]
    if (feature.geometries) feature = feature.geometries[0]
    if (!feature || feature.coordinates.length === 0) return done()
    addIntersection(task.A, task.B, feature)
    console.log(task.A.DISTRICT, task.A.STATENAME, 'intersects with', task.B.DISTRICT, task.B.STATENAME)
    done()
  })
}

function addIntersection(a, b, data) {
  a = a.STATENAME + '-' + a.DISTRICT
  b = b.STATENAME + '-' + b.DISTRICT
  if (typeof intersections[a] === 'undefined') intersections[a] = {}
  intersections[a][b] = data || true
}

function fc(geom) {
  return {
    "type": "FeatureCollection",
    "features": [
      {"type": "Feature", "geometry": geom }
    ]
  }
}
