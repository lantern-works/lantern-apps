/**
* Allows users to create new markers on the map
*/
(function () {
    var self, user, map, ctx

    let Interface = {}
    let Action = {}

    // ------------------------------------------------------------------------
    Interface.bindAll = () => {
        Interface.defineIconClasses()
        map.on('marker-click', Action.closeBottomMenu)
        self.$root.$on('marker-focus', Action.closeBottomMenu)
        self.$root.$on('marker-draft', Interface.createDraftMarker)
        user.on('auth', () => {
            self.username = user.username
        })
        user.on('leave', () => {
            self.username = null
        })
    }

    Interface.createDraftMarker = () => {
        // console.log('(composer) create draft')

        if (self.draft_marker) {
            // remove old draft
            Interface.removeDraftMarker()
        }

        // @todo allow user to choose which of several possible packages in context we want to save
        // for now defaults to first package
        if (!ctx.packages[0]) {
            console.warn('(composer) no packages in context to save marker to...')
            return
        }
        let targetPkg = ctx.packages[0]
        self.draft_marker = new LM.MarkerItem(targetPkg)
        self.draft_marker.icon = 'arrows-alt'

        let latlng = map.getCenterAsLatLng()
        latlng.lat = (latlng.lat + map.view.getBounds().getNorth() * 3) / 4
        self.draft_marker.geohash = LM.Location.toGeohash(latlng)

        map.addToMap(self.draft_marker)
        self.draft_marker.layer.dragging.enable()
        self.draft_marker.on('tag', (tag) => {
            if (self.icons.hasOwnProperty(tag)) {
                self.draft_marker.icon = self.icons[tag]
            }
            self.draft_marker.layer._icon.classList.add('lx-marker-draft')
        })

        self.draft_marker.on('untag', () => {
            self.draft_marker.icon = null
        })

        self.menu = {
            title: "What's here?"
        }
        self.menu.items = self.categories.main

        self.draft_marker.layer._icon.classList.add('lx-marker-draft')
    }

    Interface.removeDraftMarker = () => {
        self.prompt_draft_save = false
        map.removeFromMap(self.draft_marker)
        delete self.draft_marker
        self.draft_marker = null
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

    // ------------------------------------------------------------------------
    /**
    * User wants to save marker to database
    */
    Action.saveMarker = () => {
        if (self.is_saving) return
        self.is_saving = true
        self.draft_marker.layer.dragging.disable()
        self.draft_marker.owner = user.username

        self.draft_marker.save().then(() => {
            // make sure save event is intended from this app
            console.log('(composer) marker saved:', self.draft_marker.id)
            self.is_saving = false
            self.draft_marker.layer._icon.classList.remove('lx-marker-draft')
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
            map.removeFromMap(self.draft_marker)
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

    /**
    * User wants to sign-in
    */
    Action.signIn = () => {
        self.is_saving = true
        user.authOrCreate().then(() => {
            setTimeout(() => {
                self.is_saving = false
            }, 1550)
        })
    }

    // ------------------------------------------------------------------------
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

    Component.data = {
        username: null,
        draft_marker: null,
        prompt_draft_save: false,
        is_saving: false,
        menu: {
            title: null,
            items: null
        },
        previous: {}
    }
    Component.methods = {
        closeBottomMenu: Action.closeBottomMenu,
        chooseFromBottomMenu: Action.chooseFromBottomMenu,
        saveMarker: Action.saveMarker,
        goToPreviousMenu: Action.goToPreviousMenu,
        signIn: Action.signIn
    }

    return Component
}())
