(function () {

    var self

    // ------------------------------------------------------------------------
    const startMapApplications = function () {
        LT.closeOneApp('intro')
        this.show = false

        setTimeout(() => {
            LT.openOneApp('radiant')
            LT.openOneApp('xray')
        }, 150)
    }

    // ------------------------------------------------------------------------
    var config = {
        methods: {},
        computed: {},
        data: {
            'title': '',
            'slide': 0,
            'max_slide': 3,
            'show': false,
            'username': null
        },
        callback: function () {
        },
        mounted () {

            if (self) return
            self = this

            if (localStorage.hasOwnProperty('lx-app-intro-skip')) {
                // we saved a map position, therefore must be a return user...
                startMapApplications.call(this)
            } else {
                this.title = 'Lantern Network'
                this.show = true
            }

            this.username = LT.user.username

            // make sure we have an organization to work with
            let org = new LD.Organization('lnt-dev', 'Project Lantern Development Team', LT.db)

            // select package to follow data from
            let pkg = new LD.Package(self.package, LT.db)
            pkg.publish().then(() => {
                // let user watch the package for updates
                LT.user.install(pkg).then(() => {
                    LT.openOneApp('mapify')
                })

                // link our organization
                org.register()
                    .then(() => {
                        org.claim(pkg)
                    })
            })
        },
        open: true
    }

    // ------------------------------------------------------------------------
    config.methods.doComplete = function () {
        startMapApplications.call(this)
    }

    config.methods.doContinue = function () {
        this.$data.slide++
        if (this.$data.slide > this.$data.max_slide) {
            // did user get to the end of our onboarding? if so, don't bother again...
            localStorage.setItem('lx-app-intro-skip', true)
            config.methods.doComplete.call(this)
        }
    }

    return config
}())
