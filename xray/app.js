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
            LT.withAtlas(Interface.bindAll)
        }
    }
    let Action = {}

    // ------------------------------------------------------------------------
    Interface.bindAll = (atlas) => {
        Object.keys(atlas.markers).forEach((k) => {
            let marker = atlas.markers[k]
            if (marker) {
                marker.on('focus', Interface.selectMarker)
            }
        })
        atlas.on('marker-add', (marker) => {
            if (marker) {
                marker.on('focus', Interface.selectMarker)
            }
        })
        atlas.on('marker-click', Interface.selectMarker)
        LT.user.feed.on('drop', (e) => {
            if (self.marker && e.id === self.marker.id) {
                // don't display a marker that has been dropped
                self.marker = null
            }
        })
    }

    Interface.selectMarker = (marker) => {
        self.readyForSettings = false
        self.readyToDrop = false
        self.readyForLabel = false
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
        self.readyForSettings = false
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
        self.readyForSettings = false
        let pkg = new LD.Package(self.package, LT.db)
        pkg.remove(self.marker).then(() => {
            self.marker.drop().then(() => {
                self.marker = null
                self.readyToDrop = false
            })
        })
    }
    
    /**
    * User wants to agree with accuracy of data connected with this marker
    */
    Action.approveMarker = () => {      
        self.readyForSettings = false
        self.marker.approve(LT.user.username).then(() => {
            console.log(`(xray) ${self.marker.id} approval rating is ${self.marker.signatures.length}`)      
        })
    }
    
    /**
    * User wants to dispute accuracy of data connected with this marker
    */
    Action.disputeMarker = () => {
        self.readyForSettings = false
        self.marker.dispute(LT.user.username).then(() => {
            console.log(`(xray) ${self.marker.id} approval rating is ${self.marker.signatures.length}`)
        })
    }

    // ------------------------------------------------------------------------
    Component.data = {
        'rating': null,
        'marker': null,
        'label': null,
        'username': LT.user.username,
        'readyToDrop': false,
        'readyForLabel': false,
        'readyForSettings': false
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
            self.readyForSettings = false
            self.readyForLabel = false
            self.readyToDrop = true
        },
        promptForLabel: () => {
            self.readyForSettings = false
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
        approve: Action.approveMarker,
        dispute: Action.disputeMarker,
        showSettings: () => {
            console.log("show settings")
            self.readyForSettings = true
        },
        closeSettingsMenu: () => {
            self.readyForSettings = false
        },
        close: () => {
            self.readyToDrop = false
            self.readyForLabel = false
            self.readyForSettings = false
            self.marker = null
        }
    }
    // compute marker titles
    Component.computed = {}
    Component.computed.marker_title = () => {
        if (!self.marker) return null
        return self.marker.getCategory(self.categories)
    }

    Component.open = true
    return Component
}())
