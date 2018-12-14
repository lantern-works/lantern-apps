(function() {

	var config = {
		methods: {},
		computed: {},
		open: false,
		data: {
			"title": "Lantern Network",
			"slide": 0,
			"max_slide": 3
		},
		callback: function() {
		},
		mounted() {
			this.$parent.map = false;
		},
		open: true
	};

	config.methods.doComplete = function() {

		LT.closeOneApp("intro");

		setTimeout(() => {
			LT.openOneApp("radiant");
			LT.openOneApp("report");
			this.$parent.map = true;
		}, 150);
	};

	config.methods.doContinue = function() {
		this.$data.slide++;
		if (this.$data.slide > this.$data.max_slide) {
			config.methods.doComplete.call(this);
		}
	}

	return config;
}());