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


    Interface.bindAll = () => {
        // store context for view reference
        self.context = ctx
        self.markers = feed.itemsList
        console.log(self.markers)
        // wait for user auth
        user.onReady(() => {
            self.borderStyle = 'border: 2px solid ' + Interface.hexToRgbA(user.color)
        })

        user.on('leave', () => {
            self.borderStyle = 'border: none'
        })
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
        show_search: false,
        markers: [],
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

    Component.data.filter = null

    Component.computed = {}

    Component.computed.filtered_markers = () => {
        let filter = self.filter
        let list = []
        if (self.markers) {
            self.markers.forEach(key => {
                let item = feed.items[key]
                if (item) {
                    if (!filter) {
                        // no filter, show everything...
                        return list.push(item)
                    }
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
