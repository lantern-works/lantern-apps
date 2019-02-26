(function () {
    var self
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

    /**
    * User wants to save marker to database
    */
    Action.saveMarker = () => {
        if (self.is_saving) return
        self.is_saving = true
        self.draft_marker.layer.dragging.disable()
        self.draft_marker.owner = LT.user.username

        self.draft_marker.save().then(() => {
            let pkg = new LD.Package(self.package, LT.db)
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
    Action.chooseFromMenu = (item) => {
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
    Action.closeMenu = () => {
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
    // interface controls
    Interface.bindAll = (atlas) => {
        // user intended actions
        LT.on("intent:marker-add", Interface.promptForNewMarker)
        
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

    Interface.promptForNewMarker = () => {
        if (self.draft_marker) {
            // remove old draft
            Interface.removeDraftMarker()
        }

        self.draft_marker = new LM.MarkerItem(LT.db)
        self.draft_marker.geohash = LM.Location.toGeohash(self.latlng || LT.atlas.map.getCenter())
        LT.atlas.addToMap(self.draft_marker)
        self.draft_marker.layer.dragging.enable()

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
        LT.atlas.removeFromMap(self.draft_marker)
        delete self.draft_marker
        self.draft_marker = null
    }

    // ------------------------------------------------------------------------
    // starting data for view
    Component.data = {
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

    // methods available
    Component.methods = {
        closeMenu: Action.closeMenu,
        chooseFromMenu: Action.chooseFromMenu,
        saveMarker: Action.saveMarker,
        goToPreviousMenu: Action.goToPreviousMenu
    }

    // ------------------------------------------------------------------------
    return Component
}())
