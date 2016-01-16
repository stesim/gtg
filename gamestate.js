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
			//ui.completionText.show();
			var opacity = 0.2;
			var spentBudget = currentLevel.budget - currentBudget;
			if( !currentLevel.requiredBudget )
			{
				UI.get( "completed-star2" ).style.opacity = null;
				UI.get( "completed-star3" ).style.opacity = null;
				UI.hide( UI.get( "completed-star4" ) );
			}
			else if( spentBudget < currentLevel.requiredBudget )
			{
				UI.get( "completed-star2" ).style.opacity = null;
				UI.get( "completed-star3" ).style.opacity = null;
				UI.show( UI.get( "completed-star4" ) );
			}
			else if( spentBudget ===  currentLevel.requiredBudget ||
				currentLevel.requiredBuget === currentLevel.budget )
			{
				UI.get( "completed-star2" ).style.opacity = null;
				UI.get( "completed-star3" ).style.opacity = null;
				UI.hide( UI.get( "completed-star4" ) );
			}
			else if( spentBudget > currentLevel.requiredBudget &&
				spentBudget < currentLevel.budget )
			{
				UI.get( "completed-star2" ).style.opacity = null;
				UI.get( "completed-star3" ).style.opacity = opacity;
				UI.hide( UI.get( "completed-star4" ) );
			}
			else
			{
				UI.get( "completed-star2" ).style.opacity = opacity;
				UI.get( "completed-star3" ).style.opacity = opacity;
				UI.hide( UI.get( "completed-star4" ) );
			}

			UI.show( UI.get( "level-completed" ) );
			ui.ingameMenu.retryButton.show();

			var levelIndex = levels.indexOf( currentLevel );
			if( levelIndex >= 0 && levelIndex < levels.length - 1 )
			{
				ui.ingameMenu.nextButton.show();
			}
		},
		function()
		{
			//ui.completionText.hide();
			UI.hide( UI.get( "level-completed" ) );
			ui.ingameMenu.nextButton.hide();
			ui.ingameMenu.retryButton.hide();
			ui.ingameMenu.hide();
			ui.levelDetails.hide();
			ui.guardDetails.hide();
			removeGuardButtons();

			restart();
		} ),
}
