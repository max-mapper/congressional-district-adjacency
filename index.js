GLOBAL = window // hack to make the JSTS module inside turf work
var turf = require('turf')
var request = require('browser-request')
var async = require('async')

var THRESHOLD = 1000 // miles
var BUFFER = 1 // miles
var intersections = window.intersections = {}

request('districts112.ldjson', function(err, resp, data) {
  var districts = data.split('\n').map(function(json) {
    if (json.length === 0) return
    var obj = JSON.parse(json)
    obj.geojson = JSON.parse(obj.geojson)
    return obj
   })
   window.districts = districts
   var dropdown = createDropdown(districts)
   document.body.appendChild(dropdown)
   dropdown.addEventListener('change', function(e) {
     var e = e.target;
     var idx = e.options[e.selectedIndex].value
     document.body.removeChild(dropdown)
     document.body.innerHTML = "Calculating..."
     setTimeout(function() {
       calculateIntersections(+idx, function() {
         document.body.innerHTML = JSON.stringify(intersections, null, '  ')
       })
     }, 500)
   }, false)
})

function calculateIntersections(districtID, cb) {
  var num = districts.length
  
  var queue = async.queue(intersect, 1)
  
  queue.drain = function() {
    console.log("Done", intersections)
    cb()
  }
  
  for (var b = 0; b < num; b++) {
    if (districtID === b) continue
    var districtA = districts[districtID]
    var districtB = districts[b]
    queue.push({A: districtA, B: districtB})
  }
}

function intersect(task, done) {
  var fpA = task.A.geojson.coordinates[0][0]
  var fpB = task.B.geojson.coordinates[0][0]
  if (fpA[0].length) fpA = fpA[0]
  if (fpB[0].length) fpB = fpB[0]

  var point1 = turf.point(fpA[0], fpA[1])
  var point2 = turf.point(fpB[0], fpB[1])

  turf.distance(point1, point2, 'miles', function(err, distance) {
    if (err) throw err
    if (distance > THRESHOLD) return setTimeout(done, 50)
    buffer(task.A.geojson, function(err, fcA) {
      if (err) return done(err)
      buffer(task.B.geojson, function(err, fcB) {
        if (err) return done(err)
        turf.intersect(fcA, fcB, function(err, fc) {
          if (err) return setTimeout(done, 50)
          var feature = fc.features[0]
          if (feature.geometries) feature = feature.geometries[0]
          if (!feature || feature.coordinates.length === 0) return setTimeout(done, 50)
          addIntersection(task.A, task.B, feature)
          console.log(task.A.DISTRICT, task.A.STATENAME, 'intersects with', task.B.DISTRICT, task.B.STATENAME)
          setTimeout(done, 50)
        })
      })
    })
  })
}

function buffer(geom, cb) {
  turf.buffer({"type": "Feature", "geometry": geom }, BUFFER, 'miles', function(err, bufferedFC) {
    cb(err, bufferedFC)
  })
}

function addIntersection(a, b, data) {
  a = a.STATENAME + '-' + a.DISTRICT
  b = b.STATENAME + '-' + b.DISTRICT
  if (typeof intersections[a] === 'undefined') intersections[a] = {}
  intersections[a][b] = data || true
}

function createDropdown(districts) {
  var select = document.createElement('select')
  
  var option = document.createElement('option')
  option.appendChild(document.createTextNode("Select a district"))
  select.appendChild(option)

  for (var i = 0; i < districts.length; i++) {
    var option = document.createElement('option')
    option.setAttribute('value', i)
    option.appendChild(document.createTextNode(districts[i].STATENAME + '-' + districts[i].DISTRICT))
    select.appendChild(option)
  }
  return select
}