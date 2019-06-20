/**
* Renders markers to a map-based canvas and zooms the map to fit
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
        }
    }
    
    // ------------------------------------------------------------------------
    Interface.bindAll = () => {

        // basic user interface setup
        Interface.defineIconClasses()

        Interface.bindMarkers()
        
        setTimeout(() => {
            if (ctx.online) {
                Interface.backgroundCacheTiles()
            }
        }, 450)


        if (ctx.apps.hasOwnProperty('filter') && !ctx.apps.filter.isOpen()) {
            ctx.openOneApp('filter')
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

    Component.data = {
        markers: []
    }

    return Component
}())
