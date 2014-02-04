GLOBAL = window // hack to make the JSTS module inside turf work
var turf = require('turf')
var request = require('browser-request')
var async = require('async')
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
  var batchSize = 20
  var start = 0
  var end = batchSize
  
  var queue = async.queue(intersect, 1)
  
  addToQueue(start, end)
  
  queue.drain = function() {
    if (end === num) {
      console.log("Done", intersections)
      return cb()
    }
    start += batchSize
    end += batchSize
    if (end > num) {
      end = num
    }
    addToQueue(start, end)
  }
  
  function addToQueue(start, end) {
    console.log(start + '-' + end + '/' + num)
    for (var b = start; b < end; b++) {
      if (districtID === b) continue
      var districtA = districts[districtID]
      var districtB = districts[b]
      queue.push({A: districtA, B: districtB})
    }
  }
}

function intersect(task, done) {
  buffer(task.A.geojson, function(err, fcA) {
    if (err) return done(err)
    buffer(task.B.geojson, function(err, fcB) {
      if (err) return done(err)
      turf.intersect(fcA, fcB, function(err, fc) {
        if (err) return done(err)
        var feature = fc.features[0]
        if (feature.geometries) feature = feature.geometries[0]
        if (!feature || feature.coordinates.length === 0) return done()
        addIntersection(task.A, task.B, feature)
        console.log(task.A.DISTRICT, task.A.STATENAME, 'intersects with', task.B.DISTRICT, task.B.STATENAME)
        done()
      })
    })
  })
}

function buffer(geom, cb) {
  turf.buffer({"type": "Feature", "geometry": geom }, 1, 'miles', function(err, bufferedFC) {
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