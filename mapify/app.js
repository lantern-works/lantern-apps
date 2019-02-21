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
            Interface.bindAll()
        }
    }
    let Action = {}

    // ------------------------------------------------------------------------
    Interface.refresh = () => {
        LT.user.feed.forEachItem((v, k) => {
            if (v && v.g && v.o && v.t) {
                // this is a marker
                if (!LT.atlas.markers.hasOwnProperty(k)) {
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
    }

    Interface.showMarker = (e) => {
        if (!LT.atlas.markers.hasOwnProperty(e.id) && e.data.g && e.data.o && e.data.t) {
            let marker = new LM.MarkerItem(LT.db)
            marker.id = e.id
            marker.data = e.data
            // console.log("(mapify) show marker", marker.id, marker.geohash);
            LT.atlas.addToMap(marker)
            marker.setIcons(self.icons)
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
            let marker = LT.atlas.markers[e.id]
            let obj = {}
            obj[e.key] = e.data
            marker.refresh(obj)

            // if this is a ping, open details on map
            if (e.key && e.key == 'p') {
                LT.atlas.panToPoint(marker.latlng)
                marker.focus()
            }
        }
    }

    Interface.searchFilter = (type) => {
        self.filter = type
        let list = []
        Object.keys(LT.atlas.markers).forEach(key => {
            let item = LT.atlas.markers[key]
            if (item) {
                let intersection = type.match.filter(x => item.tags.includes(x));
                if (intersection.length) {
                    list.push(item)
                }
            }
        })
        self.markers = list
    }

    Interface.bindAll = () => {
        // keep the UI up-to-date based on changes to marker count
        LT.atlas.on('marker-add', () => {
            self.marker_count = LT.atlas.getMarkerCount()
        })

        LT.atlas.on('marker-remove', () => {
            self.marker_count = LT.atlas.getMarkerCount()
        })

        // add map controls
        Interface.setupControls()

        // visualize known markers
        // sync with all available markers from user-specific feed
        // this is pre-filtered based on installed packages
        Interface.refresh()
        LT.user.feed.on('change', Interface.refreshMarker)
        LT.user.feed.on('add', Interface.showMarker)
        LT.user.feed.on('drop', Interface.hideMarker)

        // filter by default to first selected type in search menu
        Interface.searchFilter(self.types[0])

        setTimeout(() => {
            if (self.marker_count == -1) {
                self.marker_count = 0
            }
            LT.atlas.setViewFromCenterLocationCache()
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

        // // add locate control
        L.control.locate({
            returnToPreviousBounds: true,
            cacheLocation: true,
            showCompass: true,
            flyTo: false,
            showPopup: false,
            setView: 'untilPanOrZoom',
            position: 'bottomright'
        }).addTo(LT.atlas.map)
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
            LT.atlas.map.zoomOut()
        },
        chooseFromMenu: (item) => {
            LT.atlas.panToPoint(item.latlng) // zoom after
            // open up item details
            item.focus()
            setTimeout(() => {
                LT.atlas.map.zoomIn(4)
            }, 500)
            self.show_search = false
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
        searchFilter: Interface.searchFilter,
        getSearchButtonClass: (type) => {
            if (type.label == self.filter.label) {
                return 'button is-selected is-info'
            }
            else {
                return 'button'
            }
        }
    }

    Component.data = {
        'markers': [],
        'marker_count': -1,
        'show_search': false,
        'snapback': false,
        'types': [
            {
                'label': 'Reports',
                'match': ['rsc', 'sit']
            },
            {
                'label': 'Places',
                'match': ['ven']
            },
            {
                'label': 'People',
                'match': ['usr']
            }
        ]
    }

    Component.data.filter = Component.data.types[0]

    return Component
}())
