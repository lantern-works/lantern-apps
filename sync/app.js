(function () {
    var self, ctx, user, db
    let Interface = {}
    let Action = {}

    const syncDisplayTime = 1050

    // ------------------------------------------------------------------------
    Interface.bindAll = () => {
        let iv = null
        db.on('sync', (msg) => {
            // Interface.printSyncData(msg)
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

    /**
    * Useful debug data to understand data being synchronized
    */
    Interface.printSyncData = (msg) => {
        if (msg.put) {
            Object.keys(msg.put).forEach(item => {
                Object.keys(msg.put[item]).forEach(field => {
                    if (field !== '#' && field !== '>' && field !== '_') {
                        console.log(`(sync) ${item}.${field}`, msg.put[item][field])
                    }
                })
            })
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
            db = data.app.context.db
            user = data.app.context.user
        }
    }

    Component.data = {
        is_syncing: false
    }

    Component.computed = {
    }

    Component.methods = {
    }

    return Component
}())
