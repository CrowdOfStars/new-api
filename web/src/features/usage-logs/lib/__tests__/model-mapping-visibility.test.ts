/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  canViewModelMappingDetails,
  resolveVisibleActualModel,
} from '../model-mapping-visibility'

describe('model mapping visibility', () => {
  test('hides actual model names from non-admin list badges', () => {
    assert.equal(
      resolveVisibleActualModel(false, 'cline-pass/deepseek-v4-pro'),
      undefined
    )
  })

  test('keeps actual model names for admin list badges', () => {
    assert.equal(
      resolveVisibleActualModel(true, 'cline-pass/deepseek-v4-pro'),
      'cline-pass/deepseek-v4-pro'
    )
  })

  test('hides the details mapping section from non-admins', () => {
    assert.equal(
      canViewModelMappingDetails(false, true, 'cline-pass/deepseek-v4-pro'),
      false
    )
  })

  test('shows the details mapping section only when mapping data exists', () => {
    assert.equal(
      canViewModelMappingDetails(true, true, 'cline-pass/deepseek-v4-pro'),
      true
    )
    assert.equal(canViewModelMappingDetails(true, true, ''), false)
    assert.equal(
      canViewModelMappingDetails(true, false, 'cline-pass/deepseek-v4-pro'),
      false
    )
  })
})
