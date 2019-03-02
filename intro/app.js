(function () {
    var self,ctx,user
    let Interface = {}
    let Action = {}


    // ------------------------------------------------------------------------


    /**
    * User wants to open a specific context with given package and markers
    */
    Action.chooseMap = (map) => {
        window.location.hash = map.id
        Interface.start()
    }


    // ------------------------------------------------------------------------
    Interface.bindAll = () => {  
        if (window.location.hash != "" && (
            localStorage.hasOwnProperty('lx-app-intro-skip') || 
            localStorage.hasOwnProperty('lx-auth') )) {
            // sign in right away
            // do we have at least one map to work with?
            user.onReady(Interface.start)
        }
        else {
            self.title = 'Lantern Network'
            self.show = true
        }

        // bind
        if (window.location.hash) {
            ctx.id = window.location.hash.replace('#', '')
        }
        window.onhashchange = (e) => {
            ctx.id = window.location.hash.replace('#', '')
        }

        ctx.feed.on('reset', () => {
            if (ctx.id) {
                user.onReady(Interface.start)
            }
            else {
                self.show = true
            }
        })
    }

    Interface.start = () => {
        if (!ctx.id || window.location.hash == "") {
            if (self.maps.length) {
                window.location.hash = self.maps[0].id
            }
        }

        if (ctx.id) {
            ctx.openOneApp('mapify')
            self.show = false
        }
    }


    // ------------------------------------------------------------------------
    let Component = {
        mounted () {
            if (self) return
            self = this
            // get or create context for packages
             ctx.db.get('ctx')
                .once((v,k) => {
                    if (!v || Object.keys(v).length === 1) {
                        ctx.db.get('ctx').set({
                            'name': 'Demo',
                            'packages': 'demo@0.0.1'
                        })
                    }
                    Interface.bindAll()
                })
                .map((v,k) => {
                    // display this as a canvas
                    self.maps.push({
                        id: k,
                        name: v.name
                    })
                })

        },
        callback: (data) => {
            ctx = data.app.context
            user = data.app.context.user
            // sign in right away
            user.authOrRegister()
        }
    }

    Component.data = {
        'title': '',
        'slide': 0,
        'max_slide': 3,
        'show': false,
        'maps': []
    }

    Component.open = true

    Component.methods = {
        doComplete: Interface.start,
        doContinue: () => {
            self.slide++
            if (self.slide > self.max_slide) {
                // did user get to the end of our onboarding? if so, don't bother again...
                localStorage.setItem('lx-app-intro-skip', true)
                Action.start()
            }
        },
        promptForMap: () => {
            self.title = null
        },
        chooseMap: Action.chooseMap
    }

    return Component
}())
