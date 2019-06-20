/**
* Determines map render and view of map
*/
(function () {
    var self, ctx, feed, map
    let Interface = {}
    let Component = {
        mounted () {
            if (self) return
            self = this
            Interface.bindAll()
        },
        callback: (data) => {
            if (ctx) return
            ctx = data.app.context
            feed = ctx.feed
            map = data.app.context.map
            map.render(ctx.cloud)
        }
    }
  
    // ------------------------------------------------------------------------
    /**
    * Use saved per-user location to center map
    */
    const setViewFromStorage = () => {
        let ctr = localStorage.getItem('lx-ctr')
        try {
            let parts = ctr.split('/')
            console.log(`${this.logPrefix} restoring view = ${parts}`)
            map.setView([parts[0], parts[1]], parts[2])
        } catch (e) {
            // will fall back to default view if no markers available
            map.setDefaultView()
        }
    }

    /**
    * Preserves center map location with browser-based storage
    */
    const storeCenterLocation = (timeout) => {
        let center = map.getCenter()
        // only save to database if user has paused on this map for a few seconds
        setTimeout(() => {
            if (center === 'ew' || map.getCenterAsString() === localStorage.getItem('lx-ctr')) {
                // don't bother saving default north american view
                return
            }
            let newCenter = map.getCenter()
            if (center === newCenter) {
                console.log(`(mapify) storing center geohash in browser: ${newCenter}`);
                localStorage.setItem('lx-ctr', newCenter)
            }
        }, timeout || 5000)
    }


    // ------------------------------------------------------------------------
    /**
    * Bind all map related controls
    */
    Interface.bindAll = () => {        
        // map controls
        Interface.setupControls()
        // try to save center location after the map moves
        map.view.on('moveend', (e) => {
            storeCenterLocation()
        })
        console.log('(map) loaded map')
    }

    /**
    * Display zoom and locate controls over the map interface
    */
    Interface.setupControls = () => {
        console.log('(map) setting up controls')
        // add zoom in & out control
        let zoom = L.control.zoom()
        zoom.setPosition('bottomright')
        zoom.addTo(map.view)

        // create custom zoom icons
        let zoom_in = document.getElementsByClassName('leaflet-control-zoom-in')[0]
        let elem = document.createElement('span')
        elem.className = 'fa fa-plus'
        zoom_in.innerHTML = ''
        zoom_in.appendChild(elem)
        let zoom_out = document.getElementsByClassName('leaflet-control-zoom-out')[0]
        let elem2 = document.createElement('span')
        elem2.className = 'fa fa-minus'
        zoom_out.innerHTML = ''
        zoom_out.appendChild(elem2)
    }

    Component.data = {
    }

    return Component
}())

