(function() {



    //------------------------------------------------------------------------
	const startMapApplications = function() {
		LT.closeOneApp("intro");
		setTimeout(() => {
			LT.openOneApp("radiant");
			LT.openOneApp("report");
			this.$parent.map = true;
		}, 150);
	}



    //------------------------------------------------------------------------
	var config = {
		methods: {},
		computed: {},
		data: {
			"title": "",
			"slide": 0,
			"max_slide": 3
		},
		callback: function() {
		},
		mounted() {
			if (!localStorage.hasOwnProperty("lx-app-intro-show")
				&& localStorage.hasOwnProperty("_pouch_lx-user")) {
				// we saved a map position, therefore must be a return user...
				startMapApplications.call(this);
			}
			else {
				this.title = "Lantern Network";
				this.$parent.map = false; 
			}
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
			config.methods.doComplete.call(this);
		}
	}

	return config;
}());