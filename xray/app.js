/**
* Inspects a selected marker to reveal data and real-time insights
*/
(function () {
    var self
    var targetMarker
    let Interface = {}
    let Component = {
        mounted () {
            if (self) return
            self = this
            Interface.bindAll()
        }
    }
    let Action = {}

    // ------------------------------------------------------------------------
    Interface.bindAll = () => {
        Object.keys(LT.atlas.markers).forEach((k) => {
            let marker = LT.atlas.markers[k]
            marker.on('focus', Interface.selectMarker)
        })
        LT.atlas.on('marker-add', (marker) => {
            marker.on('focus', Interface.selectMarker)
        })
        LT.atlas.on('marker-click', Interface.selectMarker)
        LT.user.feed.on('drop', (e) => {
            if (self.marker && e.id === self.marker.id) {
                // don't display a marker that has been dropped
                self.marker = null
            }
        })
    }

    Interface.selectMarker = (marker) => {
        if (self.marker === marker) {
            return
        }
        self.marker = marker
        marker.inspect()

    }

    // ------------------------------------------------------------------------

    /**
    * User wants to move marker
    */
    Action.relocateMarker = () => {
        targetMarker = self.marker
        targetMarker.layer.dragging.enable()
        let original_icon = self.marker.getIcon()
        targetMarker.setIcon('arrows-alt')
        self.menu = {}
        console.log(`(xray) ready for relocation of ${self.marker.id}`)
        targetMarker.once('move', (val) => {
            targetMarker.setIcon(original_icon)
            targetMarker.layer.dragging.disable()
            // add user to list of editors
            targetMarker.editor(LT.user.username)
            targetMarker.save(['editors', 'geohash'])
        })
        self.marker = null
    }

    /**
    * User wants others to be on the same page and see this marker detail sheet
    */
    Action.pingMarker = () => {
        self.marker.ping = [LT.user.username, new Date().getTime()]
        self.marker.save(['ping']).then(() => {
            console.log(`(xray) sent ping for marker ${self.marker.id}`)
        })
    }

    /**
    * User wants to drop / remove marker
    */
    Action.dropMarker = () => {
        let pkg = new LD.Package(self.package, LT.db)
        pkg.remove(self.marker).then(() => {
            self.marker.drop().then(() => {
                self.marker = null
                self.readyToDrop = false
            })
        })
    }

    // ------------------------------------------------------------------------
    Component.data = {
        'marker': null,
        'label': null,
        'username': LT.user.username,
        'readyToDrop': false,
        'readyForLabel': false
    }
    Component.methods = {
        ping: Action.pingMarker,
        move: Action.relocateMarker,
        drop: Action.dropMarker,
        scoreUp: () => {
            if (self.marker.score > 0.9) {
                return
            }
            if (!self.marker.score) {
                self.marker.score = 0
            }
            self.marker.score += 0.10
            if (self.marker.score > 1.0) {
                self.marker.score = 1.0
            }
            self.marker.save(['score'])
        },
        promptForDrop: () => {
            self.readyToDrop = true
        },
        promptForLabel: () => {
            // allow user to define name
            self.readyForLabel = !self.readyForLabel
            self.label = self.marker.label

        },
        scoreDown: () => {
            if (self.marker.score < 0.10) {
                return
            }
            self.marker.score -= 0.10
            if (self.marker.score < 0) {
                self.marker.score = 0
            }
            self.marker.save(['score'])
        },
        saveLabel: () => {
            console.log(self.label)
            self.readyForLabel = false
            self.marker.label = self.label
            self.marker.save(['label'])
        },
        close: () => {
            self.readyToDrop = false
            self.marker = null
        }
    }
    // compute marker titles
    Component.computed = {}
    Component.computed.marker_title = () => {
        if (!self.marker) return null
        return self.marker.getCategory(self.categories)
    }
    return Component
}())
