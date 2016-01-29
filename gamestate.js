function GameState( name, onenter, onleave )
{
	this.name = name;

	this._enter = onenter;
	this._leave = onleave;
}

GameState._current = null;

GameState.get = function()
{
	return GameState._current;
}

GameState.set = function( state )
{
	if( GameState._current !== null )
	{
		GameState._current._leave( state );
	}

	var prevState = GameState._current;
	GameState._current = state;

	if( GameState._current !== null )
	{
		GameState._current._enter( prevState );
	}
}

var GameStates =
{
	Menu: new GameState(
		"Menu",
		function()
		{
			if( !GameStates.Menu.lastVisible )
			{
				GameStates.Menu.lastVisible = ui.mainMenu;
			}

			graphics.disableRendering();

			GameStates.Menu.lastVisible.show();

			ui.titleText.show();
		},
		function()
		{
			ui.titleText.hide();

			GameStates.Menu.lastVisible.hide();
			if( GameStates.Menu.lastVisible === ui.developerMenu )
			{
				ui.developerMenu.levelPicker.elem.value = null;
			}

			graphics.enableRendering();
		} ),

	About: new GameState(
		"About",
		function()
		{
			function changeContent( content )
			{
				UI.hide( UI.get( "about-howto" ) );
				UI.hide( UI.get( "about-concepts" ) );
				UI.hide( UI.get( "about-algorithms" ) );
				UI.hide( UI.get( "about-credits" ) );

				UI.show( UI.get( "about-" + content ) );
			}

			if( !this.initialized )
			{
				this.initialized = true;

				UI.get( "about-button-howto" ).onclick =
					changeContent.bind( this, "howto" );
				UI.get( "about-button-concepts" ).onclick =
					changeContent.bind( this, "concepts" );
				UI.get( "about-button-algorithms" ).onclick =
					changeContent.bind( this, "algorithms" );
				UI.get( "about-button-credits" ).onclick =
					changeContent.bind( this, "credits" );

				UI.get( "about-button-back" ).onclick =
					function() { GameState.set( GameStates.Menu ); };
			}

			graphics.disableRendering();

			UI.show( UI.get( "about" ) );
		},
		function()
		{
			UI.hide( UI.get( "about" ) );

			graphics.enableRendering();
		} ),

	LevelEditing: new GameState(
		"LevelEditing",
		LevelEditor.onLoad.bind( LevelEditor ),
		LevelEditor.onExit.bind( LevelEditor ) ),

	LevelLoading: new GameState(
		"LevelLoading",
		function()
		{
		},
		function()
		{
		} ),

	SplashScreen: new GameState(
		"SplashScreen",
		function()
		{
			if( !this.screens )
			{
				this.screens =
				[
					{
						task: "Hey, good that you're here, I've got a job for you! I just opened the \"Mark Fellanti Art Gallery of Beautiful Animals\" and I need help guarding it. You think you can help me? It is pretty simple, we'll work it room-by-room. For each room you get a budget you can spend on security cameras. You need to place them at the right position, so the entire room can be seen. Come on, try it out!",
						taskImage: "task1.jpg",
						museumImage: "museum1.jpg"
					},
					{
						task: "Hey, I heard what you did at that local art gallery. I must say, you did an impressive job. What do you say to a promotion? I am the chief of a national art museum, we focus mainly on architecture and we always need intelligent staff like you. Let's see what you can do...",
						taskImage: "task2.jpg",
						museumImage: "museum2.jpg"
					},
					{
						task: "Hey, we're the Hungman twins, we own a series of international museums. We heard about what you did at your last job, you got quite a reputation. We are opening a new exhibition at our museum in Los Angeles, about geometric art. We believe you are perfect for the job. Let's get to it...",
						taskImage: "task3.jpg",
						museumImage: "museum3.jpg"
					}
				];

				this.stage = null;
				this.splash = UI.get( "splash" );
				this.splashText = UI.get( "splash-text" );

				this.show = function()
				{
					UI.show( this.splashText );
					UI.setText( this.splashText, this.screens[ this.stage ].task );
					this.splash.style.backgroundImage =
						"url(images/" + this.screens[ this.stage ].taskImage + ")";
					UI.show( this.splash );
					this.splash.style.opacity = 1;

					setTimeout( this.hideTask.bind( this ), 8000 );
				}

				this.hideTask = function()
				{
					this.splash.style.opacity = 0;

					setTimeout( this.showMuseum.bind( this ), 500 );
				}

				this.showMuseum = function()
				{
					UI.hide( this.splashText );
					this.splash.style.backgroundImage =
						"url(images/" + this.screens[ this.stage ].museumImage + ")";
					this.splash.style.opacity = 1;

					setTimeout( this.hideMuseum.bind( this ), 4000 );
				}

				this.hideMuseum = function()
				{
					this.splash.style.opacity = 0;
					UI.hide( this.splash );

					this.stage = null;

					graphics.enableRendering();
					GameState.set( GameStates.GuardPlacement );
				}
			}

			this.stage = null;
			if( isNaN( Cookie.getInt( "s0" ) ) &&
				currentLevel === levels[ 0 ] )
			{
				this.stage = 0;
			}
			else if( isNaN( Cookie.getInt( "s15" ) ) &&
				currentLevel === levels[ 15 ] )
			{
				this.stage = 1;
			}
			else if( isNaN( Cookie.getInt( "s20" ) ) &&
				currentLevel === levels[ 20 ] )
			{
				this.stage = 2;
			}

			if( this.stage !== null )
			{
				graphics.disableRendering();

				this.show();
			}
			else
			{
				GameState.set( GameStates.GuardPlacement );
			}
		},
		function()
		{
		} ),

	GuardPlacement: new GameState(
		"GuardPlacement",
		function()
		{
			ui.ingameMenu.show();
			ui.levelDetails.show();
			addGuardButtons();
			ui.guardDetails.show();

			selectGuardType( GuardTypes[ currentLevel.guardTypes[ 0 ].type ] );

			Dragging.onstart = onDragStart;
			Dragging.onmove = onDragMove;
			Dragging.onstop = onDragStop;
		},
		function( newState )
		{
			Dragging.onstart = null;
			Dragging.onmove = null;
			Dragging.onstop = null;

			if( isInFirstPerson )
			{
				switchToOverview();
			}

			if( newState !== GameStates.LevelCompleted )
			{
				ui.ingameMenu.hide();
				ui.levelDetails.hide();
				ui.guardDetails.hide();
				removeGuardButtons();

				restart();
			}
		} ),

	LevelCompleted: new GameState(
		"LevelCompleted",
		function()
		{
			var levelIndex = levels.indexOf( currentLevel );

			var opacity = 0.2;
			var spentBudget = currentLevel.budget - currentBudget;
			var stars;
			if( !currentLevel.requiredBudget )
			{
				stars = 3;
			}
			else if( spentBudget < currentLevel.requiredBudget )
			{
				stars = 4;
			}
			else if( spentBudget ===  currentLevel.requiredBudget ||
				currentLevel.requiredBuget === currentLevel.budget )
			{
				stars = 3;
			}
			else if( spentBudget > currentLevel.requiredBudget &&
				spentBudget < currentLevel.budget )
			{
				stars = 2;
			}
			else
			{
				stars = 1;
			}

			UI.get( "completed-star2" ).style.opacity =
				( stars >= 2 ? null : opacity );
			UI.get( "completed-star3" ).style.opacity =
				( stars >= 3 ? null : opacity );
			UI.setVisibility( UI.get( "completed-star4" ), stars >= 4 );

			UI.setVisibility( UI.get( "completed-next" ),
				( levelIndex >= 0 && levelIndex < levels.length - 1 ) );
			UI.show( UI.get( "level-completed" ) );

			if( levelIndex < 0 ) { return; }

			var currentProgress = Cookie.getInt( "progress" );
			if( isNaN( currentProgress ) || currentProgress <= levelIndex )
			{
				Cookie.set( "progress", levelIndex + 1 );
				if( levelIndex + 1 < levels.length )
				{
					ui.levelsMenu.buttons[ levelIndex + 1 ].enable();
				}
			}

			var currentStars = Cookie.getInt( "s" + levelIndex );
			if( isNaN( currentStars ) || currentStars < stars )
			{
				Cookie.set( "s" + levelIndex, stars );

				ui.levelsMenu.buttons[ levelIndex ].cssClass(
					"bg" + stars + "stars" );
			}
		},
		function()
		{
			//ui.completionText.hide();
			UI.hide( UI.get( "level-completed" ) );
			ui.ingameMenu.hide();
			ui.levelDetails.hide();
			ui.guardDetails.hide();
			removeGuardButtons();

			restart();
		} ),
}
