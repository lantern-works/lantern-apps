(function () {
    var self,ctx,user,db
    let Interface = {}
    let Action = {}

    const syncDisplayTime = 500

    // ------------------------------------------------------------------------
    Interface.bindAll = () => {  
        let iv = null
        db.on('sync', (msg) => {
            self.is_syncing = true
            if (iv) {
                clearInterval(iv)
            }
            iv = setTimeout(() => {
                self.is_syncing = false
                clearInterval(iv)
                iv = null
            }, syncDisplayTime)
        })
    }

    // ------------------------------------------------------------------------
    let Component = {
        mounted () {
            if (self) return
            self = this
        console.log('sync')
            Interface.bindAll()
        },
        callback: (data) => {
            ctx = data.app.context
            db = data.app.context.db
            user = data.app.context.user
        }
    }

    Component.data = {
        is_syncing: false
    }

    Component.computed = {
    }

    Component.open = true

    Component.methods = {
    }

    return Component
}())
