/**
* Reports location and safety data for users 
*/
(function () {
    var self, map, user, ctx, latlng;
    let Interface = {}
    let Component = {
        mounted () {
            if (self) return
            self = this
            // // add locate control
            L.control.locate({
                returnToPreviousBounds: true,
                cacheLocation: true,
                showCompass: true,
                flyTo: false,
                showPopup: false,
                setView: 'untilPanOrZoom',
                position: 'bottomright',
                icon: 'fa fa-location-arrow',
                onLocationError: (err) => {
                    console.warn("(status) location error", err)
                }
            }).addTo(map.view)

            Interface.bindAll()
        },
        callback: (data) => {
            ctx = data.app.context
            user = data.app.context.user
            map = data.app.context.map
        }
    }
    let Action = {}



    // ------------------------------------------------------------------------
    const getTargetPackage = () => {
        return window.location.hash.replace('#','').split(',')[0] // assume first package
    }

    const addMarkerToPackage = (marker) => {
        let pkgId = getTargetPackage()
        let pkg = new LD.Package(pkgId, LT.db)
        pkg.add(marker)
    } 


    // ------------------------------------------------------------------------
    Action.save = () => {
        self.is_saving = true
        let isNew = self.marker.mode === 'draft'
        if (!isNew) {
            self.marker.latlng = latlng
            self.marker.update(['geohash']).then(() => {
                self.is_saving = false
                self.prompt_for_save = false
            })
        }
        else {
            self.marker.save().then(() => {            
                map.removeFromMap(self.marker)
                self.is_saving = false
                self.prompt_for_save = false
            })   
        }
    }

    Action.skip = () => {
        if (self.marker) {
            self.did_skip = true
            if (self.marker.mode === 'draft') {
                map.removeFromMap(self.marker) 
            }

        }
        self.prompt_for_save = false
    }



    // ------------------------------------------------------------------------
    Interface.bindAll = () => {
        map.view.on('locationfound', Interface.promptForSave)
        map.on('marker-click', Action.skip)
    }


    Interface.createNewMarker = () => {
        console.log('(status) no marker exists yet for user')
        self.prompt_for_save = true
        // @todo offer choice of where to save user marker (which package from context)
        // for now default to first package
        if (ctx.packages[0]) {
            let marker = new LM.MarkerItem(ctx.packages[0])
            marker.tags = ['usr','ctz']
            marker.icon = 'user'
            marker.latlng = latlng
            marker.owner = user.username
            map.addToMap(marker)
            marker.layer.dragging.enable()
            self.marker = marker
        }
    }

    Interface.promptForSave = (a) => {
        if (self.marker) {
            //console.log('(status) marker exists for user')
            return
        }
        else if (self.prompt_for_save) {
            //console.log('(status) waiting for response')
            return
        }
        else if (self.did_skip) {
            //console.log('(status) user declined to save marker')
            return
        }

        latlng = a.latlng
        Interface.createNewMarker()
    }

    // ------------------------------------------------------------------------
    Component.data = {
        marker: null,
        prompt_for_save: false,
        is_saving: false,
        did_skip: false
    }

    Component.methods = {
        skip: Action.skip,
        save: Action.save
    }

    return Component
}())