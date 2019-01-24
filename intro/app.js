(function() {

    const package_name = "umbriel";

    //------------------------------------------------------------------------
    const startMapApplications = function() {
        LT.closeOneApp("intro");
        this.show = false;
    
        setTimeout(() => {
            LT.openOneApp("radiant");
        }, 150);
    }


    //------------------------------------------------------------------------
    var config = {
        methods: {},
        computed: {},
        data: {
            "title": "",
            "slide": 0,
            "max_slide": 3,
            "show": false,
            "username": null
        },
        callback: function() {
        },
        mounted() {
            if (localStorage.hasOwnProperty("lx-app-intro-skip")) {
                // we saved a map position, therefore must be a return user...
                startMapApplications.call(this);
            }
            else {
                this.title = "Lantern Network";
                this.show = true;
            }

            this.username = LT.user.username
            
            // make sure we have an organization to work with
            let org = new LX.Organization("lnt-dev", "Project Lantern Development Team", LT.db);

            // select package to follow data from
            let pkg = new LX.Package(package_name, LT.db);

            // ensure database has the expected organization and package to work with
            // then install the package for this user
            org.register()
                .then(() => {
                    return pkg.publish();
                })
                .then(() => {
                    org.claim(pkg);
                    LT.user.install(pkg)
                    .then(() => {
                        LT.openOneApp("mapify");
                    })
                })
                .catch((err) => {
                    console.error(err);
                })
        },
        open: true
    };



    //------------------------------------------------------------------------
    config.methods.doComplete = function() {
        startMapApplications.call(this);
    }

    config.methods.doContinue = function() {
        this.$data.slide++;
        if (this.$data.slide > this.$data.max_slide) {

            // did user get to the end of our onboarding? if so, don't bother again...
            localStorage.setItem("lx-app-intro-skip", true);
            config.methods.doComplete.call(this);
        }
    }

    return config;
}());