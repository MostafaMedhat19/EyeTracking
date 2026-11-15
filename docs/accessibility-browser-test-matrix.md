
# Eye Voice Accessibility and Browser Test Matrix

Related issue: #3

## 1. Purpose

This document provides a repeatable manual testing checklist for the Eye Voice application.

The objective is to verify browser compatibility, keyboard accessibility, assistive technology support, and error handling.

The checklist records actual test results, identifies potential accessibility problems, and helps future contributors repeat the same tests.

## 2. Test Environment

| Property | Value |
| --- | --- |
| Application | Eye Voice |
| Repository | MostafaMedhat19/EyeTracking |
| Operating System | macOS |
| Primary Browser | Google Chrome |
| Browser Version | Not yet recorded |
| Application URL | http://localhost:4173 |
| Test Date | November 14, 2026 |
| Testing Method | Manual |
| Accessibility Tools | Keyboard |

### Status Definitions

- **Pass:** The tested behavior works as expected.
- **Fail:** A reproducible problem has been identified.
- **Needs investigation:** An observation requires further verification.
- **Not tested:** The test has not been performed.
- **N/A:** The test does not apply to the environment.

## 3. Browser Compatibility Matrix

| Browser / Platform | Status | Observations |
| --- | --- | --- |
| Google Chrome on macOS | In progress | Initial keyboard accessibility testing completed |
| Microsoft Edge on desktop | Not tested | Pending browser testing |
| Chromium-based Android browser | Not tested | Test when an Android device is available |

### Browser Testing Procedure

For each available browser:

1. Open the application using the local server.
2. Verify that the interface loads correctly.
3. Check that essential controls are visible.
4. Navigate the interface using the keyboard.
5. Test message composition and available speech functions.
6. Verify camera permission handling.
7. Check for layout problems and unexpected errors.
8. Record the browser version and observed results.

## 4. Keyboard Accessibility Matrix

| Test | Expected Behavior | Status | Observations |
| --- | --- | --- | --- |
| Tab navigation | Tab moves focus between interactive controls | Pass (initial) | Focus moved between tested controls |
| Shift + Tab navigation | Focus moves backwards | Not tested | |
| Scanning Mode activation | Space toggles the checkbox | Pass | Space successfully toggled Scanning Mode |
| Enter on Scanning Mode | Checkbox follows standard keyboard behavior | Pass | Enter did not toggle the checkbox; this is expected behavior |
| Other control activation | Buttons respond to appropriate keyboard commands | Not tested | |
| Visible focus indicator | Focused controls are easy to identify | Needs investigation | Focus indicator was difficult to notice on some controls |
| Next button focus visibility | Focus is clearly distinguishable from the surrounding interface | Needs investigation | Focus appearance was difficult to distinguish during testing |
| Keyboard-only operation | Core tasks can be completed without a mouse | Not tested | |
| Escape key | Applicable menus or dialogs close appropriately | Not tested | |

### Keyboard Testing Procedure

1. Open Eye Voice in Chrome.
2. Set browser zoom to 100%.
3. Press Tab to navigate through the interface.
4. Observe the focus indicator for each interactive control.
5. Use Shift + Tab to navigate backwards.
6. Activate buttons using Enter or Space as appropriate.
7. Test the Scanning Mode checkbox using Space.
8. Verify that important controls can be reached and activated.
9. Record any difficult-to-see or missing focus indicators.

## 5. Screen Reader Accessibility

| Test | Expected Behavior | Status |
| --- | --- | --- |
| Accessible control names | Controls have meaningful names | Not tested |
| Status announcements | Important status changes are announced | Not tested |
| Keyboard and screen reader compatibility | Users can navigate and interact with controls | Not tested |
| Message announcements | Relevant message changes are accessible | Not tested |

### Screen Reader Testing Procedure

1. Enable a screen reader, such as VoiceOver on macOS.
2. Navigate the application using supported screen reader commands.
3. Verify that interactive controls have understandable names.
4. Activate relevant controls.
5. Check whether status changes are announced.
6. Record any missing or confusing announcements.

## 6. Reduced Motion and High Contrast

| Test | Expected Behavior | Status |
| --- | --- | --- |
| Reduced-motion preference | Unnecessary animations are reduced when requested | Not tested |
| High-contrast settings | Text and controls remain distinguishable | Not tested |
| Visible keyboard focus | Focus remains clear in supported display settings | Not tested |
| Text readability | Important text remains readable | Not tested |

### Testing Procedure

1. Enable reduced motion in the operating system.
2. Reload the application.
3. Check whether relevant animation behavior changes.
4. Enable an available high-contrast or increased-contrast setting.
5. Verify that text, buttons, and focus indicators remain distinguishable.
6. Record any issues found.

## 7. Camera and Speech API Scenarios

| Scenario | Expected Behavior | Status |
| --- | --- | --- |
| Camera permission granted | Camera-dependent features initialize appropriately | Not tested |
| Camera permission denied | User receives understandable feedback | Not tested |
| Camera unavailable | Application handles the missing device gracefully | Not tested |
| Speech recognition unavailable | Application provides appropriate feedback or fallback behavior | Not tested |
| Optional Gemini integration disabled | Core functionality remains usable without the optional integration | Not tested |

### Testing Procedure

1. Open the application without granting camera permission.
2. Observe the application's response.
3. Grant permission when comfortable and test again.
4. Test unavailable camera conditions where practical.
5. Check speech recognition behavior in the supported browser.
6. Test the application without configuring Gemini.
7. Record any unexpected behavior.

## 8. Functional Observations

### 8.1 Keyboard Focus Visibility

**Status:** Needs investigation

During keyboard-only navigation, some focused elements were difficult to distinguish from surrounding controls.

The tester had difficulty identifying the selected control at normal viewing distance.

The Scanning Mode toggle displayed a visible purple focus outline.

The Next control was also observed during keyboard navigation, but its focus appearance was difficult to distinguish clearly.

**Potential impact:**

Keyboard-only users may struggle to identify their current position in the interface.

**Suggested further testing:**

- Compare focus visibility across all interactive controls.
- Test focus indicators at 100% browser zoom.
- Check visibility under increased-contrast settings.
- Capture screenshots of affected controls.
- Evaluate whether the focus indicator has adequate contrast.

A separate accessibility issue may be appropriate if the problem is confirmed.

### 8.2 Scanning Mode

**Status:** Pass (initial activation test)

The Scanning Mode control was tested with the keyboard.

Observed behavior:

- Space successfully toggled the control.
- Enter did not toggle the control.

This behavior is consistent with standard checkbox keyboard interaction.

Further testing is needed to verify the complete scanning workflow.

### 8.3 Message Area

**Status:** Needs investigation

The Message area includes a Clear button.

During initial testing, direct keyboard typing into the Message area was unsuccessful.

It has not yet been established whether this area is designed to accept direct typing or only display messages composed through supported communication controls.

**Further testing:**

- Select a Quick Words item.
- Check whether the selected word appears in the Message area.
- Test whether Clear removes the displayed message.
- Verify intended message-entry behavior from the application documentation.

Direct typing should not be reported as a defect unless it is confirmed to be supported functionality.

### 8.4 Language Selection

**Status:** Needs investigation

The Language dropdown displayed two available language options during initial testing.

The names of these languages have not yet been recorded.

Having two language options is not automatically a defect.

**Further testing:**

- Record the available languages.
- Switch between each language.
- Test whether the selected language affects the intended features.
- Check speech output where applicable.
- Verify that controls remain accessible.

### 8.5 Speech Recognition

**Status:** Not fully tested

The interface displayed a Listen control and the message:

"Nothing was heard. Try listening again."

Further testing is required to determine the conditions that caused this message.

Suggested tests:

- Microphone permission granted.
- Microphone permission denied.
- Speech input detected.
- No speech detected.
- Speech recognition unavailable.

## 9. Confirmed Defects

No defects have yet been confirmed sufficiently for a separate bug report.

The keyboard focus visibility concern requires additional reproducibility and accessibility checks.

Any confirmed defect should be reported as a separate GitHub issue after searching for existing reports.

## 10. Bug Reporting Template

For each confirmed defect, record:

### Bug Title

A short description of the problem.

### Environment

- Operating system:
- Browser:
- Browser version:
- Application version or commit:
- Assistive technology, if applicable:

### Steps to Reproduce

1. Open the application.
2. Perform the relevant actions.
3. Observe the resulting behavior.

### Expected Behavior

Describe what should happen.

### Actual Behavior

Describe what happened.

### Evidence

Attach screenshots or a short recording where useful.

### Impact

Explain how the problem affects accessibility or functionality.

## 11. Remaining Test Checklist

- [x] Launch the application locally
- [x] Perform initial Chrome keyboard navigation testing
- [x] Test Scanning Mode using Space
- [x] Observe the visible keyboard focus indicator
- [ ] Verify all important keyboard controls
- [ ] Test Shift + Tab navigation
- [ ] Investigate focus visibility across controls
- [ ] Test message composition using Quick Words
- [ ] Test the Clear button
- [ ] Test both available language options
- [ ] Record Chrome browser version
- [ ] Test Microsoft Edge
- [ ] Test an Android Chromium browser, if available
- [ ] Perform a screen reader smoke test
- [ ] Test reduced-motion settings
- [ ] Test high-contrast settings
- [ ] Test camera permission denial
- [ ] Test missing camera behavior
- [ ] Test unavailable speech recognition
- [ ] Verify functionality without Gemini integration
- [ ] Report confirmed defects as separate GitHub issues

## 12. Conclusion

Initial Chrome testing confirms that keyboard navigation and Scanning Mode activation are functional for the controls tested.

A potential accessibility concern was identified involving the visibility of keyboard focus indicators.

Additional browser testing, screen reader verification, display preference testing, and unavailable-device scenarios remain necessary.

This document is intended to be updated as additional testing is completed.
