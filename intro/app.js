(function () {

    var self

    // ------------------------------------------------------------------------
    const startMapApplications = () => {
        LT.closeOneApp('intro')
        LT.openOneApp('radiant')
        self.show = false
    }

    const signIn = () => {
        return LT.user.authOrRegister()
    }

    const authenticated = (user) => {

        startMapApplications.call(self)
        // make sure we have an organization to work with
        let org = new LD.Organization('lnt-dev', 'Project Lantern Development Team', LT.db)

        // select package to follow data from
        let pkg = new LD.Package(self.package, LT.db)
        pkg.publish().then(() => {
            // let user watch the package for updates
            LT.user.install(pkg)

            // link our organization
            org.register()
                .then(() => {
                    org.claim(pkg)
                })
        })
    }

    // ------------------------------------------------------------------------
    var config = {
        methods: {},
        computed: {},
        data: {
            'title': '',
            'slide': 0,
            'max_slide': 3,
            'show': false
        },
        callback: function () {
        },
        mounted () {
            if (self) return
            self = this
            if (localStorage.hasOwnProperty('lx-app-intro-skip') || localStorage.hasOwnProperty('lx-auth') ) {
                // sign in right away
                signIn().then(startMapApplications())
            }
            else {
                this.title = 'Lantern Network'
                this.show = true
                LT.withUser(authenticated)
            }
        },
        open: true
    }

    // ------------------------------------------------------------------------
    config.methods.doComplete = signIn

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
