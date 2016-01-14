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

			ui.storyMenu.visible( GameStates.Menu.lastVisible === ui.storyMenu );
			ui.levelsMenu.visible( GameStates.Menu.lastVisible === ui.levelsMenu );
			ui.mainMenu.visible( GameStates.Menu.lastVisible === ui.mainMenu );

			ui.titleText.show();
		},
		function()
		{
			ui.titleText.hide();
			ui.mainMenu.hide();
			ui.storyMenu.hide();
			ui.levelsMenu.hide();

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
			ui.completionText.show();
			if( levels.indexOf( currentLevel ) < levels.length - 1 )
			{
				ui.ingameMenu.nextButton.show();
			}
		},
		function()
		{
			ui.completionText.hide();
			ui.ingameMenu.nextButton.hide();
			ui.ingameMenu.hide();
			ui.levelDetails.hide();
			ui.guardDetails.hide();
			removeGuardButtons();

			restart();
		} ),
}
