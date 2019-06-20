(function () {
    var self, ctx, user, db
    let Interface = {}
    let Action = {}

    // ------------------------------------------------------------------------

    /**
    * User wants to open a specific context with given package and markers
    */
    Action.chooseContext = (ctx) => {
        window.location.hash = ctx.id
    }

    // ------------------------------------------------------------------------

    Interface.bindAll = () => {
        window.onhashchange = (e) => {
            Interface.setContext(window.location.hash.replace('#', ''))
        }

        if (window.location.hash.length >= 1) {
            Interface.setContext(window.location.hash.replace('#', ''))
        } else {
            // if signed in, default to top priority context
            if (localStorage.hasOwnProperty('lx-app-launcher-skip')) {
                if (!ctx.id && window.location.hash == '') {
                    console.log(('(launcher) skipping intro by local storage request...'))
                    Interface.chooseTopPriorityContext()
                }
            } else {
                self.slide = 0
                self.show = true
            }
        }
        // always ask for updates over-the-air when reloading page or picking new context
        ctx.feed.on('watch', (event) => {
            let query = new LD.Query(db, event.package)
            query.compose().then(Interface.sendQuery)
        })
    }

    Interface.chooseTopPriorityContext = () => {
        let winner = {
            score: -1,
            index: 0
        }
        Object.keys(self.contexts).forEach(key => {
            let ctx = self.contexts[key]
            let pri = Number(ctx.priority)
            if (pri > winner.score) {
                winner = {
                    score: pri,
                    index: key,
                    id: ctx.id
                }
            } else if (pri == winner.score) {
                if (ctx.id > winner.id) {
                    winner = {
                        score: pri,
                        index: key,
                        id: ctx.id
                    }
                }
            }
        })        

        if (self.contexts.hasOwnProperty(winner.index)) {
            window.location.hash = self.contexts[winner.index].id
        }
        else {
            console.warn('(launcher) no context winner to use. may need to run /install first...')
            self.slide = -1
        }
    }

    Interface.setContext = (id) => {
        // no context means we should display launcher
        if (!id) {
            self.show = true
            return
        }

        // otherwise make sure context exists before we start
        db.get('ctx').get(id).once((v, k) => {
            if (!v) {
                console.log('(launcher) requested missing context. returning home...')
                window.location.hash = '#'
                return
            }

            if (ctx.apps.hasOwnProperty('map') && !ctx.apps.map.isOpen()) {
                ctx.openOneApp('map')
                ctx.openOneApp('sync')
                ctx.openOneApp('markers')
                //other marker and map-related apps
                ctx.openOneApp('composer')
                ctx.openOneApp('xray')
                ctx.openOneApp('track')
            }
            
            self.slide = -1
            ctx.id = id // this causes a number of related updates within context automatically
            // console.log('(launcher) show context: ' + id)
            self.show = false
        })
    }

    Interface.sendQuery = (msg) => {
        console.log(`(launcher) broadcast query: ${msg} (${msg.length})`)
        fetch('/api/outbox', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 'message': msg })
        })
    }
    // ------------------------------------------------------------------------
    let Component = {
        mounted () {
            if (self) return
            self = this
            // clear out our context list to begin
            self.contexts = []
            let added = {}

            // get or create context for packages
            db.get('ctx').map((v, k) => {
                if (v && v.name && !added.hasOwnProperty(v.id)) {
                    // display this as a canvas
                    added[v.id] = true
                    self.contexts.push(v)
                }
            })

            Interface.bindAll()
        },
        callback: (data) => {
            ctx = data.app.context
            db = data.app.context.db
            user = data.app.context.user
            // preserve session
            if (localStorage.hasOwnProperty('lx-auth')) {
                try {
                    let creds = localStorage['lx-auth'].split(':')
                    let username = creds[0]
                    let pass = creds[1]
                    console.log(`(launcher) authenticate as user ${username}`)
                    setTimeout(() => {
                        user.authenticate(username, pass)
                    }, 400)
                } catch (e) {
                    console.log('(launcher) unable to read credentials from storage to authenticate...')
                }
            }
        }
    }

    Component.data = {
        title: 'Lantern Network',
        slide: -1,
        max_slide: 3,
        show: false,
        contexts: []
    }

    Component.open = true

    Component.methods = {
        doComplete: Interface.chooseTopPriorityContext,
        doContinue: () => {
            self.slide++
            if (self.slide > self.max_slide) {
                // did user get to the end of our onboarding? if so, don't bother again...
                localStorage.setItem('lx-app-launcher-skip', true)
                self.slide = -1
            }
        },
        promptForMap: () => {
            if (!self.contexts.length) {
                console.warn('(launcher) no context yet. may need to run /install first...')
            }
            self.slide = -1
        },
        promptForInstall: () => {
            window.location = '/install'
        },
        close: () => {
            window.history.back()
        },
        chooseContext: Action.chooseContext,
        openDiagnostics: () => {
            window.history.back()
            ctx.openOneApp('diagnostics')
        }
    }

    return Component
}())
