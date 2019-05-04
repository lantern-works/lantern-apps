/**
* Reports location and safety data for users
*/
(function () {
    var self, map, user, ctx
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
                locateOptions: {
                    enableHighAccuracy: true
                },
                onLocationError: (err) => {
                    console.warn('(status) location error', err)
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
    Action.save = () => {
        self.is_saving = true
        self.marker.save().then((v) => {
            map.removeFromMap(self.marker)
            self.is_saving = false
            self.prompt_for_save = false
            user.node.get('marker').put(v)
        })
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
        map.view.on('locationfound', Interface.onLocationDetect)
        map.on('marker-click', Action.skip)
    }

    Interface.createNewMarker = (latlng) => {
        let firstPackage = ctx.packages[0]
        user.authOrCreate().then(() => {
            // @todo offer choice of where to save user marker (which package from context)
            // for now default to first package
            if (firstPackage) {

                console.log('(status) no marker exists yet for user')
                self.prompt_for_save = true

                let marker = new LM.MarkerItem(firstPackage)
                marker.tags = ['usr', 'ctz']
                marker.icon = 'user'
                marker.geohash = LM.Location.toGeohash(latlng)
                marker.owner = user.username
                map.addToMap(marker)
                marker.layer.dragging.enable()
                marker.layer._icon.classList.add('lx-marker-draft')
                self.marker = marker
            }
            else {
                console.log('(status) no package defined for marker')
            }
        })

    }

    /**
    * Location sensor has picked up latitude/longitude pair
    * Often is a duplicate if we're standing still
    */
    Interface.onLocationDetect = (a) => {
        if (self.marker) {
            // update location
            Interface.updateLocation(a.latlng)
            return
        } else if (self.prompt_for_save) {
            console.log('(status) waiting for response')
            return
        } else if (self.did_skip) {
            console.log('(status) user declined to save marker')
            return
        }

        // look inside our user to check for status
        user.node.get('marker').then(v => {
            if (!v) {
                Interface.createNewMarker(a.latlng)
            }
            else {
                // make sure our package knows about the user
                // let pkgNode = firstPackage.node
                // pkgNode.get('items').set(user.node.get('marker'))

                // marker associated with signed-in user
                // update location
                Interface.updateLocation(a.latlng)
            }
        })
    }

    Interface.updateLocation = (latlng) => {
        // @todo this can run repeatedly when location sensor is refreshing rapidly
        // consider performance impact and optimize if needed

        let geohash = LM.Location.toGeohash(latlng)
        let userGeohash = user.node.get('marker').get('g')
        userGeohash.once(v => {
            if (v != geohash) {
                console.log('(status) update location to: ' , geohash)
                userGeohash.put(geohash)
            }
        })
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
