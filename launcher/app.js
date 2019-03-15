(function () {
    var self,ctx,user,db
    let Interface = {}
    let Action = {}


    // ------------------------------------------------------------------------


    /**
    * User wants to open a specific context with given package and markers
    */
    Action.chooseMap = (map) => {
        window.location.hash = map.id
    }


    // ------------------------------------------------------------------------


    Interface.bindAll = () => {  

        window.onhashchange = (e) => {
            Interface.setContext(window.location.hash.replace('#', ''))
        }

        if (window.location.hash) {
            Interface.setContext(window.location.hash.replace('#', ''))
        }
        else {
            // if signed in, default to top priority context
            if (localStorage.hasOwnProperty('lx-auth') || localStorage.hasOwnProperty('lx-app-launcher-skip')) {
                if (!ctx.id && window.location.hash == "") {
                    Interface.goToContext()
                }
            }
            else {
                self.slide = 0
                self.show = true
            }
        }
    }

    Interface.goToContext = () => {
        if (self.maps.length) {
            Interface.chooseTopPriorityContext()
        }
        else {
            Interface.createFirstContext()
        }
    }

    Interface.createFirstContext = () => {
        let pkg = new LD.Package('demo', db)
        pkg.publish().then(() => {

            let context = {
                id: 'demo',
                name: 'Demo Map',
                priority: 1,
                packages: pkg.id
            }
            console.log('(launcher) creating first context', context)
            db.get('ctx').set(context).once((v,k) => {
                console.log(`(launcher) saved first context ${context.id} (${k}) with package ${pkg.id}`)
                Interface.setContext(k)
            })
        })
    }

    Interface.chooseTopPriorityContext = () => {
        let winner = {
            score: -1,
            index: 0
        }
        Object.keys(self.maps).forEach(key => {
            let pri = Number(self.maps[key].priority)
            if (pri >= winner.score) {
                winner = {
                    score: pri,
                    index: key
                }
            }
        })
        window.location.hash = self.maps[winner.index].id
    }

    Interface.setContext = (id) => {
        // no context means we should display launcher
        if (!id) {
            self.show = true
            return
        }
        // otherwise make sure context exists before we start
        db.get('ctx').get(id).on((v,k) => {
            self.show = false
            self.slide = -1
            // never begin with context unless we have valid user signed-in
            user.onReady(() => {
                ctx.id = id

                //console.log('(launcher) show context = ' + id)
                ctx.openOneApp('mapify')
                ctx.packages.forEach(pkg => {
                    let query = new LD.Query(db, pkg)
                    query.compose().then(Interface.sendQuery)
                })
            })
        })
    }

    Interface.sendQuery = (msg) => {
        console.log(`(launcher) broadcast query: ${msg} (${msg.length})`)
        fetch('/api/outbox', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({"message": msg})
        })
    }
    // ------------------------------------------------------------------------
    let Component = {
        mounted () {
            if (self) return
            self = this
            // get or create context for packages
            db.get('ctx').map((v,k) => {
                if (v && v.name) {
                    // display this as a canvas
                    self.maps.push({
                        id: k,
                        name: v.name,
                        priority: v.priority ? v.priority : 0
                    })  
                }
            })
                    
            Interface.bindAll()

        },
        callback: (data) => {
            ctx = data.app.context
            db = data.app.context.db
            user = data.app.context.user
            // sign in right away
            user.authOrRegister()
        }
    }

    Component.data = {
        title: 'Lantern Network',
        slide: -1,
        max_slide: 3,
        show: false,
        maps: []
    }

    Component.open = true

    Component.methods = {
        doComplete: Interface.goToContext,
        doContinue: () => {
            self.slide++
            if (self.slide > self.max_slide) {
                // did user get to the end of our onboarding? if so, don't bother again...
                localStorage.setItem('lx-app-launcher-skip', true)
                self.slide = -1
            }
        },
        promptForMap: () => {
            self.slide = -1
        },
        chooseMap: Action.chooseMap
    }

    return Component
}())
