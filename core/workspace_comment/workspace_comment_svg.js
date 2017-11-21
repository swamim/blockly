/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2017 Google Inc.
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Object representing a code comment on a rendered workspace.
 * @author fenichel@google.com (Rachel Fenichel)
 */
'use strict';

goog.provide('Blockly.WorkspaceCommentSvg');

goog.require('Blockly.WorkspaceComment');

/**
 * Class for a workspace comment's SVG representation.
 * Not normally called directly, workspace.newComment() is preferred.
 * @param {!Blockly.Workspace} workspace The block's workspace.
 * @param {string} content The content of this workspace comment.
 * @param {number} height Height of the comment.
 * @param {number} width Width of the comment.
 * @param {string=} opt_id Optional ID.  Use this ID if provided, otherwise
 *     create a new ID.
 * @extends {Blockly.WorkspaceComment}
 * @constructor
 */
Blockly.WorkspaceCommentSvg = function(workspace, content, height, width,
    opt_id) {
  // Create core elements for the block.
  /**
   * @type {SVGElement}
   * @private
   */
  this.svgGroup_ = Blockly.utils.createSvgElement('g',
      {'class': 'blocklyComment'}, null);
  this.svgGroup_.translate_ = '';

  /**
   * @type {SVGElement}
   * @private
   */
  this.svgPath_ = Blockly.utils.createSvgElement('path',
      {'class': 'blocklyCommentPath'}, this.svgGroup_);

  /**
   * @type {number}
   * @private
   */
  this.height_ = height;
  /**
   * @type {number}
   * @private
   */
  this.width_ = width;

  /** @type {boolean} */
  this.rendered = false;

  /**
   * Whether to move the comment to the drag surface when it is dragged.
   * True if it should move, false if it should be translated directly.
   * @type {boolean}
   * @private
   */
  this.useDragSurface_ = Blockly.utils.is3dSupported() && !!workspace.blockDragSurface_;

  Blockly.WorkspaceCommentSvg.superClass_.constructor.call(this,
      workspace, content, opt_id);
}; goog.inherits(Blockly.WorkspaceCommentSvg, Blockly.WorkspaceComment);

/**
 * Dispose of this comment.
 * @public
 */
Blockly.WorkspaceCommentSvg.prototype.dispose = function() {
  if (!this.workspace) {
    // The comment has already been deleted.
    return;
  }

  goog.dom.removeNode(this.svgGroup_);
  // Sever JavaScript to DOM connections.
  this.svgGroup_ = null;
  this.svgPath_ = null;

  Blockly.WorkspaceCommentSvg.superClass_.dispose.call(this);
};

/**
 * Create and initialize the SVG representation of a workspace comment.
 * May be called more than once.
 * @package
 */
Blockly.WorkspaceCommentSvg.prototype.initSvg = function() {
  goog.asserts.assert(this.workspace.rendered, 'Workspace is headless.');
  // if (!this.workspace.options.readOnly && !this.eventsInit_) {
  //   Blockly.bindEventWithChecks_(this.getSvgRoot(), 'mousedown', this,
  //                      this.onMouseDown_);
  // }
  this.eventsInit_ = true;

  if (!this.getSvgRoot().parentNode) {
    this.workspace.getCanvas().appendChild(this.getSvgRoot());
  }
};

/**
 * Return the coordinates of the top-left corner of this comment relative to the
 * drawing surface's origin (0,0), in workspace units.
 * If the comment is on the workspace, (0, 0) is the origin of the workspace
 * coordinate system.
 * This does not change with workspace scale.
 * @return {!goog.math.Coordinate} Object with .x and .y properties in
 *     workspace coordinates.
 * @package
 */
Blockly.WorkspaceCommentSvg.prototype.getRelativeToSurfaceXY = function() {
  var x = 0;
  var y = 0;

  var dragSurfaceGroup = this.useDragSurface_ ?
      this.workspace.blockDragSurface_.getGroup() : null;

  var element = this.getSvgRoot();
  if (element) {
    do {
      // Loop through this block and every parent.
      var xy = Blockly.utils.getRelativeXY(element);
      x += xy.x;
      y += xy.y;
      // If this element is the current element on the drag surface, include
      // the translation of the drag surface itself.
      if (this.useDragSurface_ &&
          this.workspace.blockDragSurface_.getCurrentBlock() == element) {
        var surfaceTranslation = this.workspace.blockDragSurface_.getSurfaceTranslation();
        x += surfaceTranslation.x;
        y += surfaceTranslation.y;
      }
      element = element.parentNode;
    } while (element && element != this.workspace.getCanvas() &&
        element != dragSurfaceGroup);
  }
  return new goog.math.Coordinate(x, y);
};

/**
 * Move a comment by a relative offset.
 * @param {number} dx Horizontal offset, in workspace units.
 * @param {number} dy Vertical offset, in workspace units.
 * @package
 */
Blockly.WorkspaceCommentSvg.prototype.moveBy = function(dx, dy) {
  //var event = new Blockly.Events.BlockMove(this);
  var xy = this.getRelativeToSurfaceXY();
  this.translate(xy.x + dx, xy.y + dy);
  //event.recordNew();
  this.workspace.resizeContents();
  //Blockly.Events.fire(event);
};

/**
 * Transforms a comment by setting the translation on the transform attribute
 * of the block's SVG.
 * @param {number} x The x coordinate of the translation in workspace units.
 * @param {number} y The y coordinate of the translation in workspace units.
 * @package
 */
Blockly.WorkspaceCommentSvg.prototype.translate = function(x, y) {
  this.getSvgRoot().setAttribute('transform',
      'translate(' + x + ',' + y + ')');
};

/**
 * Move this comment to its workspace's drag surface, accounting for positioning.
 * Generally should be called at the same time as setDragging(true).
 * Does nothing if useDragSurface_ is false.
 * @private
 */
Blockly.WorkspaceCommentSvg.prototype.moveToDragSurface_ = function() {
  if (!this.useDragSurface_) {
    return;
  }
  // The translation for drag surface blocks,
  // is equal to the current relative-to-surface position,
  // to keep the position in sync as it move on/off the surface.
  // This is in workspace coordinates.
  var xy = this.getRelativeToSurfaceXY();
  this.clearTransformAttributes_();
  this.workspace.blockDragSurface_.translateSurface(xy.x, xy.y);
  // Execute the move on the top-level SVG component
  this.workspace.blockDragSurface_.setBlocksAndShow(this.getSvgRoot());
};

/**
 * Move this comment back to the workspace block canvas.
 * Generally should be called at the same time as setDragging(false).
 * Does nothing if useDragSurface_ is false.
 * @param {!goog.math.Coordinate} newXY The position the comment should take on
 *     on the workspace canvas, in workspace coordinates.
 * @private
 */
Blockly.WorkspaceCommentSvg.prototype.moveOffDragSurface_ = function(newXY) {
  if (!this.useDragSurface_) {
    return;
  }
  // Translate to current position, turning off 3d.
  this.translate(newXY.x, newXY.y);
  this.workspace.blockDragSurface_.clearAndHide(this.workspace.getCanvas());
};

/**
 * Move this comment during a drag, taking into account whether we are using a
 * drag surface to translate blocks.
 * @param {!goog.math.Coordinate} newLoc The location to translate to, in
 *     workspace coordinates.
 * @package
 */
Blockly.WorkspaceCommentSvg.prototype.moveDuringDrag = function(newLoc) {
  if (this.useDragSurface_) {
    this.workspace.blockDragSurface_.translateSurface(newLoc.x, newLoc.y);
  } else {
    this.svgGroup_.translate_ = 'translate(' + newLoc.x + ',' + newLoc.y + ')';
    this.svgGroup_.setAttribute('transform',
        this.svgGroup_.translate_ + this.svgGroup_.skew_);
  }
};

/**
 * Recursively adds or removes the dragging class to this node and its children.
 * @param {boolean} adding True if adding, false if removing.
 * @package
 */
Blockly.WorkspaceCommentSvg.prototype.setDragging = function(adding) {
  if (adding) {
    var group = this.getSvgRoot();
    group.translate_ = '';
    group.skew_ = '';
    Blockly.utils.addClass(/** @type {!Element} */ (this.svgGroup_),
                      'blocklyDragging');
  } else {
    Blockly.utils.removeClass(/** @type {!Element} */ (this.svgGroup_),
                         'blocklyDragging');
  }
};

/**
 * Get comment height.
 * @return {number} comment height.
 * @public
 */
Blockly.WorkspaceCommentSvg.prototype.getHeight = function() {
  return this.height_;
};

/**
 * Set comment height.
 * @param {number} height comment height.
 * @public
 */
Blockly.WorkspaceCommentSvg.prototype.setHeight = function(height) {
  this.height_ = height;
};

/**
 * Get comment width.
 * @return {number} comment width.
 * @public
 */
Blockly.WorkspaceCommentSvg.prototype.getWidth = function() {
  return this.width_;
};

/**
 * Set comment width.
 * @param {number} width comment width.
 * @public
 */
Blockly.WorkspaceCommentSvg.prototype.setWidth = function(width) {
  this.width_ = width;
};

/**
 * Return the root node of the SVG or null if none exists.
 * @return {Element} The root SVG node (probably a group).
 * @package
 */
Blockly.WorkspaceCommentSvg.prototype.getSvgRoot = function() {
  return this.svgGroup_;
};

/**
 * Returns this comment's text.
 * @return {string} Comment text.
 * @public
 */
Blockly.WorkspaceCommentSvg.prototype.getContent = function() {
  return this.textarea_ ? this.textarea_.value : this.content_;
};

/**
 * Set this comment's content.
 * @param {string} content Comment content.
 * @public
 */
Blockly.WorkspaceCommentSvg.prototype.setContent = function(content) {
  if (this.content_ != content) {
    Blockly.Events.fire(new Blockly.Events.BlockChange(
      this.block_, 'comment', null, this.text_, content));
    this.text_ = content;
  }
  if (this.textarea_) {
    this.textarea_.value = content;
  }
};