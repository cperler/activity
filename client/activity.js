var entityMap = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': '&quot;',
	"'": '&#39;',
	"/": '&#x2F;'
};

function escapeHtml(string) {
	return String(string).replace(/[&<>"'\/]/g, function (s) {
		return entityMap[s];
	});
}

Mustache.tags = ['[[', ']]'];

var Sherpa = Sherpa || {};
Sherpa.DEBUG = true;

Sherpa.ActivityStream = {
	_updateBinding : function() {	
		$('#api-activity-nav li a').off();
		$('#api-activity-nav li a').on('click', function(){
			hash = this.hash.split('#')[1];
			$('#api-activity-nav li').removeClass('active');
			$('#api-activity-nav li#nav-' + hash).addClass('active');			
			$('#api-activity-content .activity-site').hide();
			$('#api-activity-content #site-' + hash).show();
			$('#api-activity-subnavs .subnav').hide();
			$('#api-activity-subnavs #site-' + hash).show();
			return false;
		});
		
		$('.subnav a').off();
		$('.subnav a').on('click', function(){
			$(this).toggleClass('active');
			selector = $(this).attr('data-type');
			$('.' + selector).toggle();
			return false;
		});
		
		$('.commits, .comment').off();
		$('.commits, .comment').on('click', function(e) {
			e.stopPropagation();
			$('.commits, .comment').popover('destroy');                                
			$(this).popover({'html':true});
			$(this).popover('show');
		});
		
		$("[data-toggle=tooltip]").tooltip({placement:'right'});
		
		$(document).bind('click', function (e) {
			$('.commits, .comment').popover('destroy');                                
		});
	},
	
	buildStream : function (activities) {
		for (var i = 0; i < activities.length; i++) {
			activities[i].initialize(this);
			activities[i].download();
		}
	},
	
	renderActivity : function(activity, key, data) {		
		if (data && activity.api[key].extract(data) && activity.api[key].extract(data).length > 0) {
			$('#api-activity .warning').remove();
			this.setActive = this.setActive || 0;
			
			if ('has_subnav' in activity && activity.has_subnav) {
				$('#api-activity-subnavs').append(activity.getSubnav(key, data));
				if (this.setActive == 0) {
					$('#api-activity-subnavs #site-' + activity.site).show();
				}
			}
			
			navButton = activity.getNavButton(this.setActive++, key, data);
			$('#api-activity-nav ul').append(navButton);
			
			contents = activity.getFormattedContents(key, data);
			$('#api-activity-content').append(contents);
					
			this._updateBinding();
		}
	}
};

Sherpa.Activity = function(options) {
	var that = {};

	$.extend(true, that, {site: 'not specified'}, options);		
	var getJSON = function(options) {
		console.log('Retrieving data from: ' + options.url);
		
		$.getJSON( options.url , function(){
		}).fail(function(response){
			console.log('fail');
		}).done(function(data){
			that.render(options.key, data);
		}); 
	};
	
	var getJSONP = function(options) {		
		console.log('Retrieving data from: ' + options.url);
		
		$.ajax({
			type: 'get',
			global: true,
			crossDomain: true,
			dataType:'jsonp',
			url: options.url
		}).fail(function(response){
			console.log('fail');
		}).done(function(data){
			that.render(options.key, data);
		});
	};
	
	that.initialize = function(stream) {
		that.stream = stream;
		that.urls = [];

		var input = {
			encode : function() {
				return function(text, render) {
					return encodeURIComponent(render(text));	
				}
			},
			id : that[that.site]
		};
		
		for (call in that.api) {
			that.urls.push({key:call, url:Mustache.render(that.api[call].url, input)});
		}
	};
	
	that.render = function(key, data) {
		that.stream.renderActivity(that, key, data);
	};
	
	that.getNavButton = function(setActive, key, data) {		
		if ((that.navAdded || false) !== true) {
			var extracted = that.api[key].extract(data);
			if (extracted && extracted.length > 0) {
				that.navAdded = true;
				return '<li id="nav-' + that.site + '" ' + (setActive == 0 ? ' class="active"' : '') + '><a href="#' + that.site + '">' + that.displayName + '</a></li>';
			}
		}
		return '';
	};
	
	that.getSubnavButtons = function(key, data) {
		if (that.has_subnav && data) {
			if (that.api[key].extract(data).length > 0) {
				return '<a data-type="' + key + '" class="btn btn-default active" id="subnav-' + that.site + '" href="#' + key + '">' + that.api[key].displayName + '</a>';
			}
		} 
		return '<a class="btn btn-default disabled">' + that.api[key].displayName + '</a>';
	}
	
	that.getSubnav = function(key, data) {
		subnavButtons = that.getSubnavButtons(key, data);
		if (subnavButtons != '') {
			var subnavContainer = $('div.subnav#site-' + that.site);
			if (subnavContainer.length == 0) {			
				return '<div id="site-' + that.site + '" class="subnav navbar nav-pills">' + subnavButtons + '</div>';
			} else {
				subnavContainer.append(subnavButtons);
			}
		}
		return '';
	};
	
	that.formatData = function(key, data) {
		return $.map(that.api[key].extract(data), function(element) {
			element.trim = function() { 
				return function(text, render) { 
					return render(text).trim(); 
				};
			};
			element.ellipsis = function() {
				return function(text, render) {
					var renderedText = render(text);					
					if (!renderedText.match("\\.\\.\\.$")) {
						if (renderedText.match("\\.$")) {
							renderedText += '..';
						} else {
							renderedText = renderedText.substring(0, renderedText.lastIndexOf(' ')) + '...';
						}
					}
					return renderedText;
				};
			}
			
			return Mustache.render(that.api[key].template, element);
		}).join('');
	};
	
	that.getFormattedContents = function(key, data) {
		return '<div id="site-' + that.site + '" class="activity-site">' + that.formatData(key, data) + '</div>';		
	};
	
	var _download = function(download_as, retrievalDetails) {
		if (download_as == 'json') {
			getJSON(retrievalDetails);
		} else if (download_as == 'jsonp') {
			getJSONP(retrievalDetails);
		}
	}
	
	that.download = function() {
		$.each(that.urls, function(index, element) {
			retrievalDetails = {key:element.key, url:element.url, success:that.downloadSuccess}
			_download(that.download_as, retrievalDetails);
		});
	};
	
	return that;
};

Sherpa.Activity.Yahoo = function(options) {
	var defaults = {
		site : 'yahoo',
		displayName : 'Yahoo',
		api : {
			finance : {				
				url : 'http://query.yahooapis.com/v1/public/yql?format=json&q=[[#encode]]select * from html where url="http://finance.yahoo.com/q?s=[[id]]" and xpath="//div[@id=\'yfi_headlines\']/div[2]/ul/li"[[/encode]]',
				extract : function(data) {
					if (data && data.query && data.query.results) {
						return data.query.results.li;
					}
					return [];
				},
				template : '<div class="activity-item"><a href="[[a.href]]" target="_blank">[[a.content]]</a> <cite>[[#trim]][[cite.content]][[/trim]]</cite> <span class="date">[[cite.span]]</span></div>'
			}
		},
		download_as: 'json'
	}
	return Sherpa.Activity($.extend(defaults, options));
};

Sherpa.Activity.CrunchBase = function(options) {
	var defaults = {
		site : 'crunchbase',
		displayName : 'CrunchBase',
		api : {
			people : {
				url : 'http://query.yahooapis.com/v1/public/yql?format=json&q=[[#encode]]select * from html where url="http://www.crunchbase.com/organization/[[id]]" and xpath="//div[contains(@class, \'info-tab\') and contains(@class, \'people\')]/div[contains(@class, \'card-content\')]/ul/li"[[/encode]]',
				extract : function(data) {
					if (data && data.query && data.query.results) {
						var people_data = [];
						
						for (idx in data.query.results.li) {
							var person = data.query.results.li[idx];

							var person_data = {
								img:person.span.a.img.src,
								date:person.div.h5[1].content,						
								url:person.div.h4.a.href,
								name:person.div.h4.a.content
							}
							
							if (person_data['img'] && person_data['img'].indexOf('cb-default-image') > -1) {
								person_data['img'] = '';
							}

							if (person.div.h5 instanceof Array) {
								person_data['title'] = person.div.h5[0];
							} else {
								person_data['title'] = person.div.h5;
							}
							
							people_data.push(person_data);
						}
						return people_data;
					}
					return [];
				},
				displayName : 'People',
				template : "<div class='activity-item people'><div class='date'>[[date]]</div> [[#img]]<img class='avatar' src='[[img]]'>[[/img]]<a href='http://www.crunchbase.com[[url]]' target='_blank'>[[name]]</a> added as [[title]]</div>",
			},
			funding_rounds : {
				url : 'http://query.yahooapis.com/v1/public/yql?format=json&q=[[#encode]]select * from html where url="http://www.crunchbase.com/organization/[[id]]" and xpath="//div[contains(@class, \'info-tab\') and contains(@class, \'funding\')]/div[contains(@class, \'card-content\')]/ul/li"[[/encode]]',
				extract : function(data) {
					if (data && data.query && data.query.results) {
						var funding_data = [];
						
						for (idx in data.query.results.li) {
							var raise = data.query.results.li[idx];
							
							d = new Date(raise.div.h5.content.trim());
							
							var raise_data = {
								date: (d.getMonth() + 1) + '/' + d.getDate() + '/' + (d.getFullYear()-2000),
								amount:raise.div.h4.span[0].content,
								round:raise.div.h4.span[1].a.content
							};
							
							var investors = []

							investors.push('<a target="_blank" href="http://www.crunchbase.com' + raise.div.div.div[1].a.href + '">' + raise.div.div.div[1].a.content + "</a>");
							if (raise.div.div.div[1].p) {
								for (i_idx in raise.div.div.div[1].p.a) {
									investors.push('<a target="_blank" href="http://www.crunchbase.com' + raise.div.div.div[1].p.a[i_idx].href + '">' + raise.div.div.div[1].p.a[i_idx].content + "</a>");
								}
							}
							raise_data['investors'] = investors.join(', ');
							funding_data.push(raise_data);
						}
						return funding_data;
					}
					return [];
				},
				displayName : 'Fundings',
				template: "<div class='activity-item funding_rounds'><div class='date'>[[date]]</div> <span style='color:green'>[[amount]]</span> raised in a <b>[[round]]</b> from [[&investors]]</div>"
			},
			news : {
				url : 'http://query.yahooapis.com/v1/public/yql?format=json&q=[[#encode]]select * from html where url="http://www.crunchbase.com/organization/[[id]]" and xpath="//div[contains(@class, \'info-tab\') and contains(@class, \'press_mentions\')]/div[contains(@class, \'card-content\')]/ul/li"[[/encode]]',
				extract : function(data) {
					if (data && data.query && data.query.results) {
						var news_data = [];
						
						for (idx in data.query.results.li) {
							var news_item = data.query.results.li[idx];
							var news_item_data = {																
								url:news_item.div.h4.a.href,
								title:news_item.div.h4.a.title
							};		
							if (news_item.div.div.p) {
								news_item_data['date'] = news_item.div.div.p.content && news_item.div.div.p.content.replace('-', '').trim()
							}
							news_data.push(news_item_data);
						}
						return news_data;

					}
					return [];
				},
				displayName : 'News',
				template: "<div class='activity-item news'><div class='date'>[[date]]</div> <a href='[[url]]'>[[title]]</a></div>"				
			},
			investments : {
				url : 'http://query.yahooapis.com/v1/public/yql?format=json&q=[[#encode]]select * from html where url="http://www.crunchbase.com/organization/[[id]]" and xpath="//div[contains(@class, \'info-tab\') and contains(@class, \'investments\')]/div[contains(@class, \'card-content\')]/ul/li"[[/encode]]',				
				extract : function(data) {
					if (data && data.query && data.query.results) {
						var investments_data = [];
						
						if (data.query.results.li > 1) {
							for (idx in data.query.results.li) {
								var investment = data.query.results.li[idx];
								var investment_data = {
									date: investment.div.div.p.content.replace('-', '').trim(),
									amount: investment.div.h4[1].content.trim(),
									round: investment.div.h4[1].span.content.replace('/', '').trim(),
									investment_url: investment.div.h4[0].a.href,
									investment_name: investment.div.h4[0].a.content
								};
								
								if (investment_data['round'] == 'Unknown') {
									delete investment_data['round']
								}
								investments_data.push(investment_data);
							}
						} else {
							var investment = data.query.results.li;
							var investment_data = {
								date: investment.div.div.p.content.replace('-', '').trim(),
								amount: investment.div.h4[1].content.trim(),
								round: investment.div.h4[1].span.content.replace('/', '').trim(),
								investment_url: investment.div.h4[0].a.href,
								investment_name: investment.div.h4[0].a.content
							};
							
							if (investment_data['round'] == 'Unknown') {
								delete investment_data['round']
							}
							investments_data.push(investment_data);
						}
						
						return investments_data;
					}
					return [];
				},
				displayName : 'Investments',
				template: "<div class='activity-item investments'><div class='date'>[[date]]</div><span style='color:green'>[[amount]]</span>[[#round]] ([[round]]) [[/round]] invested in <a target='_blank' href='http://www.crunchbase.com[[investment_url]]'>[[investment_name]]</a></div>"
			},
			acquisitions : {
				url : 'http://query.yahooapis.com/v1/public/yql?format=json&q=[[#encode]]select * from html where url="http://www.crunchbase.com/organization/[[id]]" and xpath="//div[contains(@class, \'info-tab\') and contains(@class, \'acquisitions\')]/div[contains(@class, \'card-content\')]/ul/li"[[/encode]]',
				extract : function(data) {
					if (data && data.query && data.query.results) {
						var acquisitions_data = [];
						for (idx in data.query.results.li) {
							var acquisition = data.query.results.li[idx];
							var acquisition_data = {
								date: acquisition.div.div.p.content.replace('-', '').trim(),
								acquisition_url: acquisition.div.h4.a.href,
								acquisition_name: acquisition.div.h4.a.content
							};
							acquisitions_data.push(acquisition_data);
						}
						return acquisitions_data;
					}
					return [];
				},
				displayName : 'Acquisitions',
				template: "<div class='activity-item acquisitions'><div class='date'>[[date]]</div>Acquired <a target='_blank' href='http://www.crunchbase.com[[acquisition_url]]'>[[acquisition_name]]</a></div>"
			},
			ipo : {
				url : 'http://query.yahooapis.com/v1/public/yql?format=json&q=[[#encode]]select * from html where url="http://www.crunchbase.com/organization/[[id]]" and xpath="//dt[contains(text(), \'IPO\')]/following-sibling::dd[1]/a/text()"[[/encode]]',
				extract : function(data) {
					if (data && data.query && data.query.results) {
						return [{'date':data.query.results.split(' on ')[1]}];
					}			
					return [];
				},
				displayName : 'IPO',
				template: "<div class='activity-item ipo'><div class='date'>[[date]]</div>Went Public</div>"			
			}
		},
		has_subnav: true,		
		download_as: 'json'
	}
	
	var that = Sherpa.Activity($.extend(defaults, options));
	
	var _cache = {};
	that.getFormattedContents = function(key, data) {
		_cache[key] = that.api[key].extract(data);
		var activity_site = $('div#site-' + that.site + '.activity-site');
		
		var sortedKeys = [];
		allData = $.map(_cache, function(data, key) {
			return $.map(data, function(element) {
				element['formatted_text'] = element.text;

				var creation_date = Date.parse(element.date);
				if (!(creation_date in sortedKeys)) {
					sortedKeys.push(creation_date);
				}
				return {'created_at':creation_date, 'formatted':Mustache.render(that.api[key].template, element)};
			});
		});

		sortedKeys.sort(function(a, b) {
		    return a - b;
		}).reverse();
				
		var sortedData = [];
		for (var i in sortedKeys){
			for (var j in allData) {
				if (sortedKeys[i] == allData[j].created_at) {					
					sortedData.push(allData[j].formatted);
					delete allData[j];
				}
			}
		}

		if (allData.length > 0) {
			for (var j in allData) {
				sortedData.push(allData[j].formatted);
			}
		}
		
		if (activity_site.length > 0) {
			activity_site.html(sortedData.join(''));
			return '';
		}
		return '<div id="site-' + that.site + '" class="activity-site">' + sortedData.join('') + '</div>';
	};	
	
	return that;
};

Sherpa.Activity.AngelList = function(options) {
	var defaults = {
		site: 'angellist',
		displayName : 'AngelList',
		api : {
			press : {				
				url : 'https://api.angel.co/1/press?startup_id=[[id]]',
				extract : function(data) {
					return data.press;
				},
				displayName : 'News',
				created_date : 'posted_at',
				template : '<div class="activity-item press"><a title="[[#ellipsis]][[#trim]][[snippet]][[/trim]][[/ellipsis]]" href="[[url]]" target="_blank">[[title]]</a> <span class="date">([[posted_at]])</span></div>'
			},
			status : {
				url : 'https://api.angel.co/1/status_updates?startup_id=[[id]]',
				extract : function(data) {
					return data.status_updates;
				},
				displayName : 'Status',
				created_date : 'created_at',
				template : '<div class="activity-item status">[[message]] <span class="date">([[created_at]])</span></div>'
			}
		},
		has_subnav: true,
		download_as: 'jsonp'
	}

	var _cache = {};	
	var that = Sherpa.Activity($.extend(defaults, options));
	
	that.getFormattedContents = function(key, data) {
		_cache[key] = that.api[key].extract(data);
		var activity_site = $('div#site-' + that.site + '.activity-site')
				
		var sortedKeys = [];
		allData = $.map(_cache, function(data, key) {
			return $.map(data, function(element) {			
				element.trim = function() { 
					return function(text, render) { 
						return render(text).trim(); 
					};
				};
				
				element.ellipsis = function() {
					return function(text, render) {
						var renderedText = render(text);					
						if (!renderedText.match("\\.\\.\\.$")) {
							if (renderedText.match("\\.$")) {
								renderedText += '..';
							} else {
								renderedText = renderedText.substring(0, renderedText.lastIndexOf(' ')) + '...';
							}
						}
						return renderedText;
					};
				};
				
				var creation_date = Date.parse(element[that.api[key].created_date]);
				if (!(creation_date in sortedKeys)) {
					sortedKeys.push(creation_date);
				}
				return {'created_at':creation_date, 'formatted':Mustache.render(that.api[key].template, element)};
			});
		});
		
		sortedKeys.sort().reverse();		
		var sortedData = [];
		for (var i in sortedKeys){
			for (var j in allData) {
				if (sortedKeys[i] == allData[j].created_at) {					
					sortedData.push(allData[j].formatted);
					delete allData[j];
				}
			}
		}
		
		if (activity_site.length > 0) {
			activity_site.html(sortedData.join(''));
			return '';
		}
		return '<div id="site-' + that.site + '" class="activity-site">' + sortedData.join('') + '</div>';
	};

	
	return that;
};

Sherpa.Activity.GitHub = function(options) {
	var defaults = {
		site: 'github',
		displayName : 'GitHub',
		api : {
			events : {				
				url : (options.isGithubPerson === true ? 'https://api.github.com/users/[[id]]/events' : 'https://api.github.com/orgs/[[id]]/events') + '?client_id=4b28c671d770e947c19c&client_secret=af1e81e156ecbbada32a7ff2568e66993b601f64',
				extract : function(data) {
					return data.data;
				},			
				template : '<div class="activity-item [[type]]" [[&style]]><a href="[[#githuburl]][[actor.url]][[/githuburl]]" target="_blank"><img class="avatar" src="[[actor.avatar_url]]"></img></a><div class="date">[[created_at]]</div><div class="bd"><a href="[[#githuburl]][[actor.url]][[/githuburl]]" target="_blank">[[actor.login]]</a> [[&event]]</div></div>'
			}
		},
		download_as: 'jsonp',
		has_subnav: true,
		event_map: {
			'PushEvent' : {
				display_name:'Commits', 
				defaultActive:true, 				
				template: "pushed <a data-content='[[#escape]]<ul>[[#payload.commits]]<li><pre>[[message]]</pre></li>[[/payload.commits]]</ul>[[/escape]]' class='commits'>[[payload.size]] commits</a> to <a href='[[#githuburl]][[repo.url]][[/githuburl]]' target='_blank'>[[repo.name]]/[[payload.ref]]</a>",
			},
			'ForkEvent' : {
				display_name:'Forks', 
				defaultActive:true,
				template:'forked <a href="[[#githuburl]][[repo.url]][[/githuburl]]" target="_blank">[[repo.name]]</a>',
			},
			'CommitCommentEvent' : {
				display_name:'Commit Comments', 
				defaultActive:false,				
				template:"added a <a class='comment' data-content='[[#escape]]<pre>[[payload.comment.body]]</pre>[[/escape]]'>comment</a> to <a href='[[#githuburl]][[repo.url]][[/githuburl]]' target='_blank'>[[repo.name]]</a>"
			},
			'WatchEvent' : {
				display_name:'Stars',
				defaultActive:false,
				template:"starred <a href='[[#githuburl]][repo.url]][[/githuburl]]' target='_blank'>[[repo.name]]</a>"
			},
			'DeleteEvent' : {
				display_name:'Deletes',
				defaultActive:false,
				template:"deleted [[payload.ref_type]] [[payload.ref]] from <a href='[[#githuburl]][[repo.url]][[/githuburl]]' target='_blank'>[[repo.name]]</a>"
			},
			'CreateEvent' : {
				display_name:'Creates',
				defaultActive:false,
				template:"created [[payload.ref_type]] [[payload.ref]] on <a href='[[#githuburl]][[repo.url]][[/githuburl]]' target='_blank'>[[repo.name]]</a>"
			},
			'IssuesEvent' : {
				display_name:'Issues',
				defaultActive:true,
				template:"[[payload.action]] issue <a href='[[payload.issue.html_url]] target='_blank'>[[repo.name]]#[[payload.issue.number]]</a><div class='small'>[[payload.issue.title]]</div>"
			},
			'IssueCommentEvent' : {
				display_name:'Issue Comments',
				defaultActive:false,
				template:"added a <a class='comment' data-content='[[#escape]]<pre>[[payload.comment.body]]</pre>[[/escape]]'>comment</a> to issue <a href='[[#githuburl]][[payload.issue.html_url]][[/githuburl]]' target='_blank'>[[repo.name]]#[[payload.issue.number]]</a>"
			},
			'PublicEvent' : {
				display_name:'Made Public',
				defaultActive:true,
				template:"made <a href='[[#githuburl]][repo.url]][[/githuburl]]' target='_blank'>[[repo.name]]</a> public!"
			}
		}
	}
	var that = Sherpa.Activity($.extend(defaults, options));
	
	that.formatData = function(key, data) {
		return  $.map(data.data, function(element) {
			if (element.type in that.event_map) {
				var event = that.event_map[element.type]
				var hide = !event.defaultActive;
				element.githuburl = function() {
					return function(text, render) {
						var renderedText = render(text);
						return renderedText.replace('api.github.com&#x2F;repos', 'github.com').replace('api.github.com&#x2F;users', 'github.com');
					}
				}
				element.escape = function() {
					return function(text, render) {
						return escapeHtml(render(text));
					}
				}
				element.event = Mustache.render(event.template, element);				
				element.style = (hide ? 'style="display:none;"':'');
				
				return Mustache.render(that.api[key].template, element);
			}
			return '';
		}).join('');
	}
	
	that.getSubnavButtons = function(key, data) {
		var eventTypes = [];
		$.each(data.data, function(index, element) {
			if (element.type in that.event_map && $.inArray(element.type, eventTypes) == -1) {
				eventTypes.push(element.type);
			}
		});
		return $.map(eventTypes, function(element) {
			var event = that.event_map[element];
			return '<a data-type="'+element+'" class="btn btn-default '+ (event.defaultActive ? 'active' : '') + '" id="subnav-' + that.site + '" href="#' + element + '">' + event.display_name + '</a>';
		}).join('');
	}
	
	return that;
};

Sherpa.Activity.Twitter = function(options) {
	
	var defaults = {
		site: 'twitter',
		displayName : 'Twitter',

		api : {
			search : {				
				url : '/twitter/search/[[id]]',
				extract : function(data) {
					return data.statuses;
				},
				displayName : 'Tweets About',
				template : '<div class="activity-item search"><a href="http://www.twitter.com/[[user.screen_name]]" target="_blank"><img class="avatar" src="[[user.profile_image_url]]" alt="[[user.name]]"></img><b>[[user.name]]</b> <span class="small">@[[user.screen_name]]</span></a><div class="bd"><span>[[&formatted_text]]</span> <span class="date">[[created_at]]</span></div></div>'
			},
			tweets : {
				url : '/twitter/tweets/[[id]]',
				extract : function(data) { 
					return data;
				},
				displayName : 'Tweets From',
				template : '<div class="activity-item tweets"><a href="http://www.twitter.com/[[user.screen_name]]" target="_blank"><img class="avatar" src="[[user.profile_image_url]]" alt="[[user.name]]"></img><b>[[user.name]]</b> <span class="small">@[[user.screen_name]]</span></a><div class="bd"><span>[[&formatted_text]]</span> <span class="date">[[created_at]]</span></div></div>'
			}
		},
		has_subnav: true,
		download_as : (Sherpa.DEBUG ? 'jsonp' : 'json')
	};	
	
	if (options['exclude_tweets_about']) {
		delete defaults.api['search'];
	}
	
	var that = Sherpa.Activity($.extend(defaults, options['identifiers']));
	var _cache = {};

	var linkify_result = function (tweet) {
		var subs = [], 
			last_offset = 0,
			new_tweet = '', 
			entity,
			replace = { 
				hashtags: function (text) {
					return '<a target="_blank" href="https://twitter.com/search?q=%23' + text + '">#' + text + '</a>';
				},  
				media: function (text) {
					return '<a target="_blank" href="' + text[0] + '">' + text[1] + '</a>';
				},  
				urls: function (text) {
					return '<a target="_blank" href="' + text[0] + '">' + text[1] + '</a>';
				},  
				user_mentions: function (text) {
					return '<a target="_blank" href="https://twitter.com/' + text + '">@' + text + '</a>';
				}   
			};  
		for (entity in tweet.entities) {
			tweet.entities[entity].forEach(function (d, i) {
				subs.push([
					entity,
					d.indices,
					d.text ? d.text :
					d.display_url ? [d.url, d.display_url] :
					d.screen_name
				]); 
			}); 
		}   

		subs.sort(function (a, b) {
			return a[1][0] - b[1][0];
		}); 

		subs.forEach(function (d, i) {
			new_tweet += tweet.text.slice(last_offset, d[1][0]);
			new_tweet += replace[d[0]](d[2]);
			last_offset = d[1][1];
		}); 

		new_tweet += tweet.text.slice(last_offset);
		return new_tweet;
	};	
	
	that.getSubnavButtons = function(key, data) {
		if (data) {
			if (that.api[key].extract(data).length > 0) {
				return '<a data-type="' + key + '" class="btn btn-default active" id="subnav-' + that.site + '" href="#' + key + '">' + that.api[key].displayName + '</a>';
			}
		} 
		return '<a class="btn btn-default disabled">' + that.api[key].displayName + '</a>';	
	}

	that.getFormattedContents = function(key, data) {
		_cache[key] = that.api[key].extract(data);
		var activity_site = $('div#site-' + that.site + '.activity-site');
		
		var sortedKeys = [];
		allData = $.map(_cache, function(data, key) {
			return $.map(data, function(element) {
				try {
					var linkified = linkify_result(element);
					element['formatted_text'] = linkified;		
				} catch (e) {
					element['formatted_text'] = element.text;
				}
				
				var creation_date = Date.parse(element.created_at);
				if (!(creation_date in sortedKeys)) {
					sortedKeys.push(creation_date);
				}
				return {'created_at':creation_date, 'formatted':Mustache.render(that.api[key].template, element)};
			});
		});
		
		sortedKeys.sort().reverse();		
		var sortedData = [];
		for (var i in sortedKeys){
			for (var j in allData) {
				if (sortedKeys[i] == allData[j].created_at) {					
					sortedData.push(allData[j].formatted);
					delete allData[j];
				}
			}
		}
		
		if (activity_site.length > 0) {
			activity_site.html(sortedData.join(''));
			return '';
		}
		return '<div id="site-' + that.site + '" class="activity-site">' + sortedData.join('') + '</div>';
	};
	
	return that;
};