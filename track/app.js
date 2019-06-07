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
            Interface.bindAll()
        },
        callback: (data) => {
            ctx = data.app.context
            db = ctx.db
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
            self.marker.link(db.get('usr').get(user.username))
        })
        .then(() => {
            self.$root.$emit('marker-focus', self.marker)
        })
    }

    Action.skip = () => {
        if (self.draft_marker) {
            console.log('(track) removing from map')
            map.removeFromMap(self.marker)
            self.draft_marker = null
        }
        self.prompt_for_save = false
    }

    // ------------------------------------------------------------------------
    Interface.bindAll = () => {

        // rate limit location detection
        const rateLimit = 30000
        let isLimited = false

        map.view.on('locationfound', (a) => {
            console.log("is limited", isLimited)
            if (!isLimited) {
                Interface.onLocationDetect(a)
            }
            isLimited = true

            setTimeout(() => {
                isLimited = false
            }, rateLimit)
        })

        // show icon for location controls
        Interface.showLocateControl()
        map.on('marker-click', Action.skip)
    }

    Interface.showLocateControl = () => {
        // add locate control
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
                console.warn('(track) location error', err)
            }
        }).addTo(map.view)
    }

    Interface.showUserMarker = (newGeohash) => {
        return new Promise((resolve, reject) => {
            //console.log('(track) looking to move user marker to ' + newGeohash)
            // @todo allow more control over which package markers are linked to
            let firstPackage = ctx.packages[0]
            if (!firstPackage) {
                console.warn('(track) no available package to display marker within. ignoring location...')
                reject()
            }

            // check if we have the marker in the feed
            if (ctx.feed.activeItems.hasOwnProperty(user.username)) {
                // we are watching a marker
                let marker = ctx.feed.activeItems[user.username]
                marker.geohash = newGeohash
                //console.log('(track) update existing user marker', marker)
                marker.update(['geohash']).then(() => {
                    return resolve(marker)
                })

            }

            // first, check if we have existing user in database
            db.get('usr').get(user.username).then((v,k) => {
                let marker = new LM.MarkerItem(firstPackage)
                marker.id = user.username
                marker.tags = ['usr', 'ctz']
                marker.icon = 'user'
                if (!v) {
                    // ready to create a new user marker
                    console.log('(track) prepare to create new user marker')
                    marker.geohash = newGeohash
                    self.prompt_for_save = true
                    marker.owner = user.username
                    map.addToMap(marker)
                    marker.layer.dragging.enable()
                    marker.layer._icon.classList.add('lx-marker-draft')
                    self.draft_marker = marker
                }
                else {
                    let userObj = db.get('usr').get(user.username)
                    userObj.get('g').put(newGeohash)
                    // do link
                    firstPackage.node.get('items').get(user.username).put(userObj)
                    console.log('(track) update existing user marker', marker)
                }
                resolve(marker)
            })
        })
    }

    /**
    * Location sensor has picked up latitude/longitude pair
    * Often is a duplicate if we're standing still
    */
    Interface.onLocationDetect = (a) => {
        let newGeohash = LM.Location.toGeohash(a.latlng, 8)

        if (self.marker && self.marker.geohash === newGeohash) {
            return
        }

        self.$root.$emit('user-location', newGeohash)

        // first we find or create dedicated user marker
        user.authOrCreate().then(() => {
            console.log(`(track) detected location for user ${user.username} = ${newGeohash}`)
            Interface.showUserMarker(newGeohash).then(marker => {
                self.marker = marker
                //console.log(`(track) working with user marker ${marker.id}`, marker)
            })
        })
        return
    }

    // ------------------------------------------------------------------------
    Component.data = {
        marker: null,
        prompt_for_save: false,
        draft_marker: null,
        is_saving: false,
        did_skip: false
    }

    Component.methods = {
        skip: Action.skip,
        save: Action.save
    }

    return Component
}())
