(function () {
    var self,ctx,user
    let Interface = {}
    let Action = {}


    // ------------------------------------------------------------------------
    Action.start = () => {
        ctx.closeOneApp('intro')
        ctx.openOneApp('mapify')
        self.show = false
    }


    // ------------------------------------------------------------------------
    Interface.bindAll = () => {  
        if (localStorage.hasOwnProperty('lx-app-intro-skip') || localStorage.hasOwnProperty('lx-auth') ) {
            // sign in right away
            user.onReady(Action.start)
        }
        else {
            self.title = 'Lantern Network'
            self.show = true
        }
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
            // sign in right away
            user.authOrRegister()
        }
    }

    Component.data = {
        'title': '',
        'slide': 0,
        'max_slide': 3,
        'show': false
    }

    Component.open = true

    Component.methods = {
        doComplete: Action.start,
        doContinue: () => {
            self.slide++
            if (self.slide > self.max_slide) {
                // did user get to the end of our onboarding? if so, don't bother again...
                localStorage.setItem('lx-app-intro-skip', true)
                Action.start()
            }
        }
    }

    return Component
}())
