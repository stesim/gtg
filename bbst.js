// fake (i.e. non-balanced) balanced binary search tree implementation

function BSTNode( _value, _left, _right, _parent )
{
	this.value = _value;
	this.left = _left;
	this.right = _right;
	this.parent = _parent;
}

function BST()
{
	this.root = null;

	this.predicate = function( a, b ) { return ( a > b ); };
}

BST.prototype.insert = function( v )
{
	var newNode = new BSTNode( v, null, null, null );

	if( this.root === null )
	{
		newNode.parent = this;
		this.root = newNode;
	}
	else
	{
		var iter = this.root;
		while( true )
		{
			if( this.predicate( v, iter.value ) )
			{
				if( iter.right === null )
				{
					newNode.parent = iter;
					iter.right = newNode;
					break;
				}
				iter = iter.right;
			}
			else
			{
				if( iter.left === null )
				{
					newNode.parent = iter;
					iter.left = newNode;
					break;
				}
				iter = iter.left;
			}
		}
	}
}

BST.prototype.remove = function( v )
{
	var node = this.find( v );
	if( node !== null )
	{
		node.remove();
	}
}

BST.prototype.find = function( v )
{
	var iter = this.root;
	while( iter !== null && iter.value !== v )
	{
		if( this.predicate( v, iter.value ) )
		{
			iter = iter.right;
		}
		else
		{
			iter = iter.left;
		}
	}

	return iter;
}

BST.prototype.findClosest = function( v )
{
	if( this.root === null )
	{
		return null;
	}

	var closestLeft = null;
	var closestRight = null;
	var iter = this.root;
	while( iter.value !== v )
	{
		if( this.predicate( v, iter.value ) )
		{
			if( closestLeft === null
				|| this.predicate( iter.value, closestLeft.value ) )
			{
				closestLeft = iter;
			}
			if( iter.right === null )
			{
				return { left: closestLeft, right: closestRight };
			}
			iter = iter.right;
		}
		else
		{
			if( closestRight === null
				|| this.predicate( closestRight.value, iter.value ) )
			{
				closestRight = iter;
			}
			if( iter.left === null )
			{
				return { left: closestLeft, right: closestRight };
			}
			iter = iter.left;
		}
	}
	return { left: iter, right: iter };
}

BST.prototype.traverseInOrder = function( func )
{
	if( this.root !== null )
	{
		this.root.traverseInOrder( func );
	}
}

BST.prototype.traversePreOrder = function( func )
{
	if( this.root !== null )
	{
		this.root.traversePreOrder( func );
	}
}

BST.prototype.traversePostOrder = function( func )
{
	if( this.root !== null )
	{
		this.root.traversePostOrder( func );
	}
}

BSTNode.prototype.remove = function()
{
	function replaceInParentWith( that, newChild )
	{
		if( that.parent !== null )
		{
			if( that.parent.left == that )
			{
				that.parent.left = newChild;
			}
			else if( that.parent.right == that )
			{
				that.parent.right = newChild;
			}
			else
			{
				that.parent.root = newChild;
			}
		}
		if( newChild !== null )
		{
			newChild.parent = that.parent;
		}
		that.parent = null;
	}

	var hasLeftChild = ( this.left !== null );
	var hasRightChild = ( this.right !== null );

	if( hasLeftChild && hasRightChild )
	{
		var minNode = this.right.findMin();
		this.value = minNode.value;
		minNode.remove();
	}
	else if( hasLeftChild )
	{
		replaceInParentWith( this, this.left );
	}
	else if( hasRightChild )
	{
		replaceInParentWith( this, this.right );
	}
	else
	{
		replaceInParentWith( this, null );
	}
}

BSTNode.prototype.findMin = function()
{
	var iter = this;
	while( iter.left !== null )
	{
		iter = iter.left;
	}
	return iter;
}

BSTNode.prototype.traverseInOrder = function( func )
{
	if( this.left !== null )
	{
		this.left.traverseInOrder( func );
	}
	func( this );
	if( this.right !== null )
	{
		this.right.traverseInOrder( func );
	}
}

BSTNode.prototype.traversePreOrder = function( func )
{
	func( this );
	if( this.left !== null )
	{
		this.left.traversePreOrder( func );
	}
	if( this.right !== null )
	{
		this.right.traversePreOrder( func );
	}
}

BSTNode.prototype.traversePostOrder = function( func )
{
	if( this.left !== null )
	{
		this.left.traversePostOrder( func );
	}
	if( this.right !== null )
	{
		this.right.traversePostOrder( func );
	}
	func( this );
}
