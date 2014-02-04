calculates which congressional districts are adjacent to each other

congressional district boundaries converted from a shapefile from http://cdmaps.polisci.ucla.edu/

to run:

```
npm install
npm start
open http://localhost:9966
```

it does a polygon intersection using the district boundaries. first the boundaries are buffered by 1 mile, so any districts whose boundaries are within 1 mile of another district boundary will be returne.

intersection calculation will take some time and progress will be logged into the JS console
