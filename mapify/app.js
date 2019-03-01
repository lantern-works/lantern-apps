/**
* Renders markers to a map-based canvas and counts the number of markers
* Also offers a search-box to find relevant markers
*/
(function () {
    var self
    let Interface = {}
    let Component = {
        mounted () {
            if (self) return
            self = this
            // wait for atlas and then bind map interface
            LT.withAtlas(Interface.bindAll)
        }
    }
    let Action = {}

    const getTargetPackage = () => {
        return window.location.hash.replace('#','').split(',')[0] // assume first package
    }

    // ------------------------------------------------------------------------

    /**
    * User wants to save marker to database
    */
    Action.saveMarker = () => {
        if (self.is_saving) return
        self.is_saving = true
        self.draft_marker.layer.dragging.disable()
        self.draft_marker.owner = LT.user.username

        // find package we want to save to
        let pkgId = getTargetPackage()
        if (!pkgId) {
            console.log(`(radiant) cannot save marker since missing package`)
            return
        }
        let pkg = new LD.Package(pkgId, LT.db)
        self.draft_marker.save().then(() => {
            pkg.add(self.draft_marker)
            // make sure save event is intended from this app
            console.log('(radiant) marker saved:', self.draft_marker.id)
            self.is_saving = false
            Interface.removeDraftMarker()
        })

        self.prompt_draft_save = false
        self.menu = {}
    }

    /**
    * User wants to choose menu from item,
    */
    Action.chooseFromBottomMenu = (item) => {
        if (self.draft_marker) {
            // special actions for reporting menu
            if (self.categories.hasOwnProperty(item.tag)) {
                if (self.menu.items && self.menu.title) {
                    self.previous = {
                        title: self.menu.title,
                        items: self.menu.items,
                        tag: item.tag
                    }
                }

                self.menu.items = self.categories[item.tag]
                self.menu.title = item.label
            } else if (self.previous.tag) {
                self.draft_marker.tag(self.previous.tag)
                self.prompt_draft_save = true
            }
            self.draft_marker.tag(item.tag)
        } else if (item.hasOwnProperty('method')) {
            item.method(item)
        }
    }

    /**
    * User wants to close menu
    */
    Action.closeBottomMenu = () => {
        self.menu = {}
        if (self.draft_marker) {
            LT.atlas.removeFromMap(self.draft_marker)
            self.draft_marker = null
        }
    }

    /**
    * User wants to navigate backwards to previous menu
    */
    Action.goToPreviousMenu = () => {
        if (self.is_saving) return

        self.draft_marker.untagAll()
        self.prompt_draft_save = false

        if (self.previous.title && self.previous.items) {
            self.menu.title = self.previous.title
            self.menu.items = self.previous.items
            self.previous = {}
        }
    }


    // ------------------------------------------------------------------------

    Interface.promptForNewMarker = () => {
        if (self.draft_marker) {
            // remove old draft
            Interface.removeDraftMarker()
        }   

        self.draft_marker = new LM.MarkerItem(LT.db)
        self.draft_marker.icon = "map-marker-alt"

        let latlng = LT.atlas.map.getCenter()
        latlng.lat = (latlng.lat + LT.atlas.map.getBounds().getNorth() * 3) / 4
        self.draft_marker.geohash = LM.Location.toGeohash(latlng)


        LT.atlas.addToMap(self.draft_marker)
        self.draft_marker.layer.dragging.enable()

        self.$root.$emit('marker-draft', self.draft_marker)

        LT.atlas.zoomMinimum(8)

        self.draft_marker.on('tag', (tag) => {
           if (self.icons.hasOwnProperty(tag)) {
                self.draft_marker.icon = self.icons[tag]
           }
        })

        self.draft_marker.on('untag', () => {
            self.draft_marker.icon = null
        })

        self.menu = {
            title: "What's here?"
        }
        self.menu.items = self.categories.main
    }

    Interface.removeDraftMarker = () => {
        self.prompt_draft_save = false
        LT.atlas.removeFromMap(self.draft_marker)
        delete self.draft_marker
        self.draft_marker = null
    }


    Interface.refresh = () => {
        LT.withUser(user => {
            user.feed.forEachItem((v, k) => {
                if (v && v.g && v.o && v.t) {
                    // this is a marker
                    if (!LT.atlas.markers[k]) {
                        Interface.showMarker({ id: k, data: v })
                    } else {
                        // exists in UI
                        let marker = LT.atlas.markers[k]
                        marker.refresh(v)
                    }
                } else {
                    Interface.hideMarker({ id: k })
                }
            })
        })
    }

    Interface.showMarker = (e) => {
        if (!LT.atlas.markers[e.id] && e.data.g && e.data.o && e.data.t) {
            let marker = new LM.MarkerItem(LT.db)
            marker.id = e.id
            marker.data = e.data
            // console.log("(mapify) show marker", marker.id, marker.geohash);
            marker.tags.forEach((tag) => {
                if (self.icons.hasOwnProperty(tag)) {
                    marker.icon = self.icons[tag]
                }
            })

            LT.atlas.addToMap(marker)
        }

    }

    Interface.hideMarker = (e) => {
        if (LT.atlas.markers[e.id]) {
            console.log('(mapify) hide existing marker', e.id)
            LT.atlas.removeFromMap(LT.atlas.markers[e.id])
        }

    }

    Interface.refreshMarker = (e) => {
        if (LT.atlas.markers[e.id]) {
            console.log("(mapify) refresh marker" + e.id)
            let marker = LT.atlas.markers[e.id]
            let obj = {}
            obj[e.key] = e.data
            marker.refresh(obj)

            // if this is a ping, open details on map
            if (e.key && e.key == 'p') {
                LT.atlas.panToPoint(marker.latlng)
                self.$root.$emit('marker-focus', marker)
            }
        }
    }

    Interface.bindAll = (atlas) => {
    
        self.markers = atlas.markerList

        // visualize known markers
        // sync with all available markers from user-specific feed
        // this is pre-filtered based on installed packages  

        // add map controls
        Interface.setupControls()
        

        // keep the UI up-to-date based on changes to marker count
        atlas.on('marker-add', () => {
            self.marker_count = atlas.getMarkerCount()
        })
        atlas.on('marker-remove', () => {
            self.marker_count = atlas.getMarkerCount()
        })

        atlas.on('marker-click', Action.closeBottomMenu)

        LT.withUser( user => {
            user.feed.on('change', Interface.refreshMarker)
            user.feed.on('add', Interface.showMarker)
            user.feed.on('drop', Interface.hideMarker)
            user.feed.on('watch', Interface.refresh)
        })
        
        // set up custom icons for menu
        for (var idx in self.categories) {
            let menu = self.categories[idx]
            menu.forEach((item) => {
                if (self.icons.hasOwnProperty(item.tag)) {
                    // only show sub-menu icons
                    if (!self.categories.hasOwnProperty(item.tag)) {
                        item.icon_class = 'fa fa-' + self.icons[item.tag]
                        item.tag_class = 'tag-icon ' + item.tag
                        if (idx != 'main') {
                            item.tag_class += ' ' + idx
                        }
                    }
                }
            })
        }

        setTimeout(() => {
            if (self.marker_count == -1) {
                self.marker_count = 0
            }
        }, 750)
            
    }

    /**
    * Display zoom and locate controls over the map interface
    */
    Interface.setupControls = () => {
        // add zoom in & out control
        let zoom = L.control.zoom()
        zoom.setPosition('bottomright')
        zoom.addTo(LT.atlas.map)

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

    // ------------------------------------------------------------------------

    Component.methods = {
        searchMap: () => {
            self.show_search = !self.show_search
        },
        fitMap: () => {
            if (self.snapback) {
                self.snapback = false
                return LT.atlas.setViewFromCenterLocationCache()
            }
            self.snapback = true
            LT.atlas.cacheCenterLocation(0)
            LT.atlas.fitMapToAllMarkers()
        },
        chooseFromMenu: (item) => {
            LT.atlas.panToPoint(item.latlng).then(() => {
                // open up item details
                self.$root.$emit('marker-focus', item)
            }) // zoom after
            self.show_search = false
            Action.closeBottomMenu()
        },
        closeMenu: () => {
            self.show_search = false
        },
        getCategory: (item) => {
            return item.getCategory(self.categories)
        },
        getMarkerClass: (item) => {
            return 'tag-icon ' + item.tags.join(' ')
        },
        getMarkerIconClass: (item) => {
            let cls = 'fa '
            item.tags.forEach((tag) => {
                if (self.icons.hasOwnProperty(tag)) {
                    cls += ' fa-' + self.icons[tag]
                }
            })
            return cls
        },
        searchFilter: (type) => {
            self.filter = type || self.filter
        }, 
        getSearchButtonClass: (type) => {
            if (type.label == self.filter.label) {
                return 'button is-selected is-info'
            }
            else {
                return 'button'
            }
        },
        promptForNewMarker:  Interface.promptForNewMarker,
        closeBottomMenu: Action.closeBottomMenu,
        chooseFromBottomMenu: Action.chooseFromBottomMenu,
        saveMarker: Action.saveMarker,
        goToPreviousMenu: Action.goToPreviousMenu
    }

    Component.data = {
        markers: [],
        marker_count: -1,
        show_search: false,
        snapback: false,
        types: [
            {
                'label': 'Resource',
                'match': ['rsc']
            },
            {
                'label': 'Task',
                'match': ['tsk']
            },
            {
                'label': 'Report',
                'match': [ 'sit'], 
            },
            {
                'label': 'Site',
                'match': ['ven']
            }
        ],
        draft_marker: null,
        prompt_draft_save: false,
        menu: {
            title: null,
            items: null
        },
        previous: {},
        latlng: null,
        is_saving: false
    }

    Component.data.filter = Component.data.types[0]

    Component.computed = {}

    Component.computed.filtered_markers = () => {
        let filter = self.filter || self.types[0]
        let list = []
        self.markers.forEach(key => {
            let item = LT.atlas.markers[key]
            if (item) {
                let intersection = filter.match.filter(x => item.tags.includes(x));
                if (intersection.length) {
                    list.push(item)
                }
            }
        })
        return list
    }

    Component.open = true

    return Component
}())
