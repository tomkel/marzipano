/*
 * Copyright 2016 Google Inc. All rights reserved.
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
'use strict';

var Dynamics = require('./Dynamics');
var HammerGestures = require('./HammerGestures');
var defaults = require('../util/defaults');
var eventEmitter = require('minimal-event-emitter');
var maxFriction = require('./util').maxFriction;

var defaultOptions = {
  speed: 2,
  friction: 6,
  maxFrictionTime: 0.3
};


/**
 * @class
 * @classdesc Control the view by clicking and moving the mouse. Also known as
 * "QTVR" control mode.
 *
 * @implements ControlMethod
 *
 * @param {Element} element Element to listen for events.
 * @param {string} pointerType Which Hammer.js pointer type to use (e.g.
 * `mouse` or `touch`).
 * @param {Object} opts
 * @param {number} opts.speed
 * @param {number} opts.friction
 * @param {number} opts.maxFrictionTime
 */
// TODO: allow speed not change linearly with distance to click spot.
// Quadratic or other would allow a larger speed range.
function PtrLockControlMethod(element, pointerType, opts) {
  this._element = element;

  this._opts = defaults(opts || {}, defaultOptions);

  this._active = false;

  this._dynamics = {
    x: new Dynamics(),
    y: new Dynamics()
  };

  this._element.addEventListener('click', this._handleStart.bind(this))
  this._element.addEventListener('mousemove', this._handleMove.bind(this))
  document.addEventListener('pointerlockchange', this._handleRelease.bind(this))
}

eventEmitter(PtrLockControlMethod);

/**
 * Destroy the instance
 */
PtrLockControlMethod.prototype.destroy = function() {
  this._element = null;
  this._opts = null;
  this._active = null;
  this._dynamics = null;
};


PtrLockControlMethod.prototype._handleStart = function(e) {
  if (this._active) return
  e.preventDefault();
  this._element.requestPointerLock();
};


PtrLockControlMethod.prototype._handleMove = function(e) {
  if (!this._active) return
  e.preventDefault();
  this._updateDynamics(e, false);
};


PtrLockControlMethod.prototype._handleRelease = function(e) {
  if (this._active) {
    this._updateDynamics(e, true);
  }
  this._active = !this._active;
  this.emit(this._active ? 'active' : 'inactive');
};


var tmpReleaseFriction = [ null, null ];
PtrLockControlMethod.prototype._updateDynamics = function(e, release) {
  if (!release) {
    var elementRect = this._element.getBoundingClientRect();
    var width = elementRect.right - elementRect.left;
    var height = elementRect.bottom - elementRect.top;
    var maxDim = Math.max(width, height);

    var xD = e.movementX / 10
    var yD = e.movementY / 10

    this._dynamics.x.reset();
    this._dynamics.y.reset();
    this._dynamics.x.velocity = xD;
    this._dynamics.y.velocity = yD;
  }
  maxFriction(this._opts.friction, this._dynamics.x.velocity, this._dynamics.y.velocity, this._opts.maxFrictionTime, tmpReleaseFriction);
  this._dynamics.x.friction = tmpReleaseFriction[0];
  this._dynamics.y.friction = tmpReleaseFriction[1];

  this.emit('parameterDynamics', 'x', this._dynamics.x);
  this.emit('parameterDynamics', 'y', this._dynamics.y);
};


module.exports = PtrLockControlMethod;
