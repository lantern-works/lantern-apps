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

        self.online = ctx.online
        
        user.onReady(() => {
            self.username = user.username
        })

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
            Interface.clearMarker()
        }
    }

    Interface.color = (username) => {
        if (!username) return
        var hash = 0
        for (var i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash)
        }
        var color = '#'
        for (var i = 0; i < 3; i++) {
            var value = (hash >> (i * 8)) & 0xFF
            color += ('00' + value.toString(16)).substr(-2)
        }
        return color
    }

    Interface.selectMarker = (marker) => {
        self.readyForLabel = false
        if (self.marker) {
            Interface.clearMarker()
        }
        self.marker = marker
        if (marker.tags.indexOf('rsc') !== -1) {
            self.scoreLabel = 'Resource Level'
            if (marker.tags.indexOf('net') !== -1) {
                self.menu = [
                    {label: 'Working Fully', value: 1.0},
                    {label: 'Partial Connectivity', value: 0.3 },
                    {label: 'Limited Connectivity ', value: 0.2},
                    {label: 'No Internet', value: 0.1}
                ]
            }
            if (marker.tags.indexOf('pwr') !== -1) {
                self.menu = [
                    {label: 'Plenty Available', value: 1.0},
                    {label: 'Some Available ', value: 0.3 },
                    {label: 'Limited Power', value: 0.2},
                    {label: 'No Power', value: 0.1}
                ]
            }
            else {

                self.menu = [
                    {label: 'Full Supply', value: 1.0},
                    {label: 'Partial Supply', value: 0.3 },
                    {label: 'Almost Empty ', value: 0.2},
                    {label: 'Empty', value: 0.1}
                ]   
            }
        }
        else if (marker.tags.indexOf('usr') !== -1) {
            self.scoreLabel = 'Safety Level'
            self.menu = [
                {label: 'Unreported', value: 0.1},
                {label: 'Need Help', value: 0.2},
                {label: 'Safe', value: 0.3 },
                {label: 'Ready to Help Others', value: 1.0}
            ]
        }
        if (marker.tags.indexOf('tsk') !== -1) {
            self.scoreLabel = 'Task Progress'
            self.menu = [
                {label: 'New', value: 0.1},
                {label: 'Assigned', value: 0.2},
                {label: 'In Progress', value: 0.3 },
                {label: 'Complete', value: 1.0}
            ]
        }
        if (marker.tags.indexOf('ven') !== -1) {
            self.scoreLabel = 'Capacity'
            self.menu = [
                {label: 'Just Opened', value: 0.1},
                {label: 'Space Available', value: 0.2},
                {label: 'Nearing Capacity', value: 0.3 },
                {label: 'At Capacity', value: 1.0}
            ]
        }
        self.marker.layer._icon.classList.add('did-focus')
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
        self.readyForLabel = false
        self.view = 'index'
        Interface.clearMarker()
        self.maxZoom = false
    }

    /**
    * User wants to move marker
    */
    Action.relocateMarker = () => {
        self.view = 'index'

        if (!self.marker.owner) {
            self.marker.owner = user.username
        }
        targetMarker = self.marker
        targetMarker.layer.dragging.enable()
        let original_icon = self.marker.icon
        targetMarker.icon = 'arrows-alt'
        self.menu = {}
        //console.log(`(xray) ready for relocation of ${self.marker.id}`)

        targetMarker.once('move', (val) => {
            targetMarker.icon = original_icon
            targetMarker.layer.dragging.disable()
            // add user to list of editors
            targetMarker.editor(user.username)
            targetMarker.update(['owner', 'editors', 'geohash'])
        })
        Interface.clearMarker()
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

    Interface.clearMarker = () => {
        if (!self.marker) return
        if (self.marker.layer._icon) {
            self.marker.layer._icon.classList.remove('did-focus')
        }
        self.marker = null
        self.note = null
        self.view = 'index'
    }

    /**
    * User wants to drop / remove marker
    */
    Action.dropMarker = () => {
        self.view = 'index'
        self.marker.drop().then(Interface.clearMarker)
    }

    /**
    * User wants to agree with accuracy of data connected with this marker
    */
    Action.approveMarker = () => {
        self.view = 'index'
        self.marker.approve(user.username).then(() => {
            console.log(`(xray) ${self.marker.id} approval rating is ${self.marker.signatures.length}`)
        })
    }

    /**
    * User wants to dispute accuracy of data connected with this marker
    */
    Action.disputeMarker = () => {
        self.view = 'index'
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


    /**
    * User wants to list viewers
    */
    Action.showViewers = () => {
        self.view = 'users'


    }

    // ------------------------------------------------------------------------
    Component.data = {
        view: 'index',
        rating: null,
        marker: null,
        label: null,
        note: null,
        username: null,
        readyForLabel: false,
        pingInProgress: false,
        isLoading: false,
        maxZoom: false,
        scoreLabel: 'Score',
        online: false,
        menu: []
    }
    Component.methods = {
        ping: Action.pingMarker,
        move: Action.relocateMarker,
        drop: Action.dropMarker,
        selectMenuItem: (item) => {
            self.marker.score = item.value
            self.marker.update(['owner', 'score']).then(() => {
                self.view = 'index'
            })
        },
        showScoreMenu: () => {
           self.view = 'score'
        },
        scoreUp: () => {
            if (!user.username) {
                console.log('(xray) skip score change since user is not signed in...')
                return
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
        },
        promptForDrop: () => {
            self.view = 'remove'
        },
        promptForLabel: () => {
            if (!user.username) {
                console.log('(xray) skip label prompt since user is not signed in...')
                return
            }
            self.view = 'index'
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
            
            if (self.marker.score < 0.10) {
                return
            }
            self.marker.score -= 0.10
            if (self.marker.score < 0) {
                self.marker.score = 0
            }
            self.marker.update(['owner', 'score'])
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
        showNoteForm: () => {
            self.view = 'note'
        },
        showForm: () => {
            self.view = 'form'
        },
        showIndex: () => {
            self.view = 'index'
        },
        closeFormMenu: () => {
            self.view = 'index'
        },
        saveNote: () => {
            if (!self.note) return
            console.log('(xray) save note...', self.note)
            self.marker.note(self.note)
            self.marker.update('notes').then(() => {
                self.note = null
                self.view = 'index'
            })
        },
        removeNote: (txt) => {
            console.log('(xray) remove note...', txt)
            self.marker.removeNote(txt)
            self.marker.update('notes')
        },
        showSettings: () => {
            self.view = 'settings'
        },
        closeSettingsMenu: () => {
            self.view = 'index'
        },
        close: Action.closeMenu,
        inspect: () => {
            self.marker.inspect()
        },
        signIn: Action.signIn,
        follow: () => {
            console.log('(xray) follow')            
            self.marker.viewer(user.username)
            console.log(self.marker)
            self.marker.update('viewers')
        },
        unfollow: (username) => {
            console.log(this)
            self.marker.removeViewer(username)
            self.marker.update('viewers')
        },
        showViewers: Action.showViewers,
        color: Interface.color
    }
    // compute marker titles
    Component.computed = {}
    Component.computed.marker_category = () => {
        if (!self.marker) return null
        return self.marker.getCategory(self.categories)
    }
    Component.computed.marker_title = () => {
        if (!self.marker) return null
        let label = self.marker.getCategory(self.categories)
        if (self.marker.label) {
            label += ': ' + self.marker.label
        }
        return label
    }

    Component.computed.score_label = () => {
        if (!self.marker) return
        for (var idx in self.menu) {
            let item = self.menu[idx]
            if (self.marker.score === item.value) {
                return item.label
            }
        }
        // if no score exists, default to use first item 
        return self.menu[0].label
    }
    return Component
}())
