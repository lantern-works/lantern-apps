/**
* Renders markers to a map-based canvas and counts the number of markers
* Also offers a search-box to find relevant markers
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
    let Action = {}

    // ------------------------------------------------------------------------

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
                // console.log(`(mapify) storing center geohash in browser: ${newCenter}`);
                localStorage.setItem('lx-ctr', newCenter)
            }
        }, timeout || 5000)
    }

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

    Interface.showMarker = (marker) => {
        if (marker.constructor.name !== 'MarkerItem') {
            console.log('(mapify) skip show for non-marker', marker)
            return
        } else if (marker.layer) {
            // already added to map
            console.log("(mapify) skip show marker, already on map...", marker.id, marker.geohash);
            return
        }

        console.log(`(mapify) show marker ${marker.id} (${marker.tags})`);

        marker.tags.forEach((tag) => {
            if (self.icons.hasOwnProperty(tag)) {
                marker.icon = self.icons[tag]
            }
        })

        if (marker.icon) {
            map.addToMap(marker)
        }

        if (self.markers.length == 1) {
            map.panToPoint(marker.latlng)
        }
        else {
            map.fitMapToAllMarkers(feed.activeItems)
        }

        marker.on('change', (key) => {
            if (marker.layer._icon) {
                marker.layer._icon.classList.add('did-change')
            }
            // if this is a ping, open details on map
            if (key == 'ping') {
                console.log('ping received for', marker, key)
                self.$root.$emit('marker-focus', marker)
            }
        })
    }

    Interface.hideMarker = (marker) => {
        // console.log('(mapify) hide existing marker', marker.id)
        if (marker.layer && marker.layer._map) {
            map.removeFromMap(marker)
        }
    }

    Interface.defineIconClasses = () => {
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
    }
    
    Interface.hexToRgbA = (hex) => {
        var c
        if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
            c= hex.substring(1).split('')
            if(c.length== 3){
                c= [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c= '0x'+c.join('')
            return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+',0.9)'
        }
        throw new Error('Bad Hex')
    }

    Interface.showActiveMarkers = () => {
        feed.itemsList.forEach(Interface.showMarker)
    }


    Interface.bindMarkers = () => {
        self.markers = []
        self.markers = feed.itemsList

        // initial marker data load-in
        Interface.showActiveMarkers()

        // show any new markers added to our context
        feed.on('item-watch', (e) =>  Interface.showMarker(e.item))

        // hide markers when they are removed from context
        feed.on('item-unwatch', (e) => {
            if (e.item && e.item.layer) {
                Interface.hideMarker(e.item)
            }
        })

        // handle marker selection
        map.on('marker-click', (marker) => {
            if (marker.layer._icon) {
                marker.layer._icon.classList.remove('did-change')
            }
        })

        // handle marker focus
        self.$root.$on('marker-focus', (marker) => {
            // center the marker on the map and make sure we have some basic zoom
            if (marker.latlng) {
                map.panToPoint(marker.latlng).then(() => {
                    map.zoomMinimum(10)
                })
            }

            // mark the marker as "read"
            if (marker.layer && marker.layer._icon) {
                marker.layer._icon.classList.remove('did-change')
            }
        })

    }

    Interface.bindAll = () => {
        // store context for view reference
        self.context = ctx

        Interface.bindMarkers()

        setTimeout(() => {
            if (ctx.online) {
                Interface.backgroundCacheTiles()
            }
        }, 450)


        // wait for user auth
        user.onReady(() => {
            self.borderStyle = 'border: 2px solid ' + Interface.hexToRgbA(user.color)
        })

        user.on('leave', () => {
            self.borderStyle = 'border: none'
        })

        // basic user interface setup
        Interface.setupControls()
        Interface.defineIconClasses()

        // try to save center location after the map moves
        map.view.on('moveend', (e) => {
            storeCenterLocation()
        })

        // other marker and map-related apps
        ctx.openOneApp('sync')
        ctx.openOneApp('composer')
        ctx.openOneApp('xray')
        ctx.openOneApp('track')
    }

    /**
    * Finds markers on map and stores relevant tiles we may need for offline use
    */
    Interface.backgroundCacheTiles = () => {
        let delay = 1000
        feed.itemsList.forEach(key => {
            let marker = feed.items[key]
            setTimeout(() => {
                map.cacheTilesFromMarker(marker)
            }, delay += 10000)
        })
    }

    /**
    * Display zoom and locate controls over the map interface
    */
    Interface.setupControls = () => {
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

    Interface.promptForNewMarker = () => {
        self.$root.$emit('marker-draft')
    }

    // ------------------------------------------------------------------------

    Component.methods = {
        searchMap: () => {
            self.show_search = !self.show_search
        },
        fitMap: () => {
            if (self.snapback) {
                let parts = self.snapback.split('/')
                let zoomLevel = Number(parts[2])
                map.view.setView([parts[0], parts[1]], (zoomLevel > 1 ? zoomLevel : 8))
                console.log('(mapify) snapback to ' + self.snapback)
                self.snapback = null
            } else {
                self.snapback = map.getCenterAsString()
                map.fitMapToAllMarkers(feed.activeItems)
            }
        },
        chooseMap: () => {
            window.location.hash = ''
        },
        chooseFromMenu: (item) => {
            // open up item details
            self.$root.$emit('marker-focus', item)
            self.show_search = false
        },
        closeMenu: () => {
            self.show_search = false
        },
        getCategory: (item) => {
            if (!item.getCategory) {
                return console.warn('(mapify) missing getCategory for', item)
            }
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
            } else {
                return 'button'
            }
        },
        promptForNewMarker: Interface.promptForNewMarker
    }

    Component.data = {
        context: null,
        markers: [],
        show_search: false,
        snapback: false,
        borderStyle: '',
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
                'label': 'Situation',
                'match': [ 'sit', 'usr']
            },
            {
                'label': 'Venue',
                'match': ['ven']
            }
        ],
        latlng: null
    }

    Component.data.filter = Component.data.types[0]

    Component.computed = {}

    Component.computed.filtered_markers = () => {
        let filter = self.filter || self.types[0]
        let list = []
        if (self.markers) {
            self.markers.forEach(key => {
                let item = feed.items[key]
                if (item) {
                    let intersection = filter.match.filter(x => item.tags.includes(x))
                    if (intersection.length) {
                        list.push(item)
                    }
                }
            })
        }
        return list
    }

    return Component
}())
