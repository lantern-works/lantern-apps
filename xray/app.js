/**
* Inspects a selected marker to reveal data and real-time insights
*/
(function () {
    var self, user, ctx, map, targetMarker, pingTimeout

    let Interface = {}
    let Component = {
        mounted () {
            if (self) return
            self = this
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
    Interface.bindAll = () => {
        user.on('auth', () => {
            self.username = user.username
        })

        user.on('leave', () => {
            self.username = null
        })

        self.maxZoom = map.hasMaxZoom()
        self.$root.$on('marker-focus', (marker) => {
            Interface.selectMarker(marker)
        })

        self.$root.$on('marker-draft', (marker) => {
            Action.closeMenu()
        })

        map.view.on('click', () => {
            Action.closeMenu()
        })

        map.on('marker-remove', () => {
            Action.closeMenu()
        })

        map.on('marker-click', Interface.selectMarker)

        if (ctx.feed) {
            ctx.feed.on('drop', Interface.dropMarker)
        }

        ctx.on('change', (e) => {
            ctx.feed.on('drop', Interface.dropMarker)
        })
    }

    Interface.dropMarker = () => {
        if (self.marker && e.id === self.marker.id) {
            // don't display a marker that has been dropped
            self.marker = null
        }
    }

    Interface.selectMarker = (marker) => {
        self.readyForSettings = false
        self.readyToDrop = false
        self.readyForLabel = false
        if (self.marker === marker) {
            return
        }
        self.marker = marker
        const tagsWithScores = ['net', 'clo', 'eat', 'tsk', 'pwr', 'wtr', 'ful']
         self.showScore  = marker.tags.filter(value => -1 !== tagsWithScores.indexOf(value)).length >= 1
        console.log( self.showScore )
    }

    // ------------------------------------------------------------------------

    /**
    * User wants to close menu
    */
    Action.closeMenu = () => {
        if (pingTimeout) {
            clearInterval(pingTimeout)
        }
        self.pingInProgress = false
        self.readyToDrop = false
        self.readyForLabel = false
        self.readyForSettings = false
        self.marker = null
        self.maxZoom = false
    }

    /**
    * User wants to move marker
    */
    Action.relocateMarker = () => {
        self.readyForSettings = false

        if (!self.marker.owner) {
            self.marker.owner = user.username
        }

        targetMarker = self.marker
        targetMarker.layer.dragging.enable()
        let original_icon = self.marker.icon
        targetMarker.icon = 'arrows-alt'
        self.menu = {}
        console.log(`(xray) ready for relocation of ${self.marker.id}`)

        targetMarker.once('move', (val) => {
            targetMarker.icon = original_icon
            targetMarker.layer.dragging.disable()
            // add user to list of editors
            targetMarker.editor(user.username)
            targetMarker.update(['owner', 'editors', 'geohash'])
        })
        self.marker = null
    }

    /**
    * User wants others to be on the same page and see this marker detail sheet
    */
    Action.pingMarker = () => {
        self.pingInProgress = true
        self.marker.ping = [user.username, new Date().getTime()]
        self.marker.update(['ping']).then(() => {
            console.log(`(xray) sent ping for marker ${self.marker.id}`)
            pingTimeout = setTimeout(() => {
                self.pingInProgress = false
            }, 5000)
        })
    }

    /**
    * User wants to drop / remove marker
    */
    Action.dropMarker = () => {
        self.readyForSettings = false
        self.marker.drop().then(() => {
            self.marker = null
            self.readyToDrop = false
        })
    }

    /**
    * User wants to agree with accuracy of data connected with this marker
    */
    Action.approveMarker = () => {
        self.readyForSettings = false
        self.marker.approve(user.username).then(() => {
            console.log(`(xray) ${self.marker.id} approval rating is ${self.marker.signatures.length}`)
        })
    }

    /**
    * User wants to dispute accuracy of data connected with this marker
    */
    Action.disputeMarker = () => {
        self.readyForSettings = false
        self.marker.dispute(user.username).then(() => {
            console.log(`(xray) ${self.marker.id} approval rating is ${self.marker.signatures.length}`)
        })
    }

    /**
    * User wants to map this
    */
    Action.mapMarker = () => {
        let lat = self.marker.latlng.lat
        let lng = self.marker.latlng.lon
        if /* if we're on iOS, open in Apple Maps */
        ((navigator.platform.indexOf('iPhone') != -1) ||
             (navigator.platform.indexOf('iPad') != -1) ||
             (navigator.platform.indexOf('iPod') != -1)) {
            window.open(`maps://maps.google.com/maps?daddr=${lat},${lng}&amp;ll=`)
        } else {
            /* else use Google */
            window.open(`https://maps.google.com/maps?daddr=${lat},${lng}&amp;ll=`)
        }
    }

    /**
    * User wants to sign-in
    */
    Action.signIn = () => {
        self.isLoading = true
        user.authOrCreate().then(() => {
            setTimeout(() => {
                self.isLoading = false
            }, 1550)
        })
    }
    // ------------------------------------------------------------------------
    Component.data = {
        rating: null,
        marker: null,
        label: null,
        username: null,
        readyToDrop: false,
        readyForLabel: false,
        readyForSettings: false,
        pingInProgress: false,
        isLoading: false,
        maxZoom: false,
        showScore: false
    }
    Component.methods = {
        ping: Action.pingMarker,
        move: Action.relocateMarker,
        drop: Action.dropMarker,
        scoreUp: () => {
            if (!user.username) {
                console.log('(xray) skip score change since user is not signed in...')
                return
            }

            if (!self.marker.owner) {
                self.marker.owner = user.username
            }

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
            self.marker.update(['owner', 'score'])
            self.readyForSettings = false
        },
        promptForDrop: () => {
            self.readyForSettings = false
            self.readyForLabel = false
            self.readyToDrop = true
        },
        promptForLabel: () => {
            if (!user.username) {
                console.log('(xray) skip label prompt since user is not signed in...')
                return
            }
            self.readyForSettings = false
            // allow user to define name
            self.readyForLabel = !self.readyForLabel
            self.label = self.marker.label
        },
        zoomIn: () => {
            map.panToPoint(self.marker.latlng).then(() => {
                map.zoomToPoint(self.marker.latlng)
                map.zoomMinimum(10)
                self.maxZoom = map.hasMaxZoom()
                setTimeout(() => {
                    self.maxZoom = map.hasMaxZoom()
                }, 500)
            })
        },
        zoomOut: () => {
            map.view.zoomOut()
            self.maxZoom = map.hasMaxZoom()
        },
        scoreDown: () => {
            if (!user.username) {
                console.log('(xray) skip score change since user is not signed in...')
                return
            }

            if (!self.marker.owner) {
                self.marker.owner = user.username
            }

            if (self.marker.score < 0.10) {
                return
            }
            self.marker.score -= 0.10
            if (self.marker.score < 0) {
                self.marker.score = 0
            }
            self.marker.update(['owner', 'score'])
            self.readyForSettings = false
        },
        saveLabel: () => {
            self.readyForLabel = false
            if (!self.marker.owner) {
                self.marker.owner = user.username
            }
            self.marker.label = self.label
            self.marker.update(['owner', 'label'])
        },
        approve: Action.approveMarker,
        dispute: Action.disputeMarker,
        map: Action.mapMarker,
        showSettings: () => {
            self.readyForSettings = true
        },
        closeSettingsMenu: () => {
            self.readyForSettings = false
        },
        close: Action.closeMenu,
        inspect: () => {
            self.marker.inspect()
        },
        signIn: Action.signIn
    }
    // compute marker titles
    Component.computed = {}
    Component.computed.marker_title = () => {
        if (!self.marker) return null
        return self.marker.getCategory(self.categories)
    }
    return Component
}())
