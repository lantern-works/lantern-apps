(function () {
    var self, ctx, user, db
    let Interface = {}
    let Action = {}

    // ------------------------------------------------------------------------
    Interface.bindAll = () => {
        Interface.refreshCounts()
    }

    Interface.refreshCounts = (id) => {
        let counts = [['net', 'node'], ['pkg', 'package'], ['ctx', 'context'], ['usr', 'user']]
        counts.forEach(item => {
            if (id && item[0] !== id) return
            Interface.refreshOneCount(item, id ? true : false)
        })
    }

    Interface.refreshOneCount = (item, log) => {
        self[`${item[1]}Count`] = 0
        db.get(item[0]).map((v,k) => {
            if (v) {
                self[`${item[1]}Count`]++
            }
            if (log) {
                console.log(`(diagnostics) ${item[1]} = ${k}`)
                console.log(JSON.parse(JSON.stringify(v)))
            }
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
            db = data.app.context.db
            user = data.app.context.user
        }
    }

    Component.data = {
        nodeCount: 0,
        packageCount: 0,
        contextCount: 0,
        userCount: 0
    }

    Component.computed = {
    }

    Component.methods = {
        printPackages: () => {
            Interface.refreshCounts('pkg')
        },
        printContexts: () => {
            Interface.refreshCounts('ctx')
        },
        printNodes: () => {
            Interface.refreshCounts('net')
        },
        printUsers: () => {
            Interface.refreshCounts('usr')
        },
        close: () => {
            ctx.closeOneApp('diagnostics')
        }
    }

    return Component
}())
