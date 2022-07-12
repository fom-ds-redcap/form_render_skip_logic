/**
 * Returns a set of key-value pairs that correspond to the query
 * parameters in the given url. When handling repeating instruments
 * (i.e. the url points to js) the onclick call is picked apart
 * and returned as the parameters.
 */
function getQueryParameters(url, click) {
    if (url == "javascript:;") {
        var tmp = click.replace(/ |'|\);/g,'').split(',')
        var parameters = {id: tmp[1], event_id: tmp[2], page: tmp[3]}
    }
    else {
        var parameters = {};
        var queryString = getQueryString(url);
        var reg = /([^?&=]+)=?([^&]*)/g;
        var keyValuePair;

        while (keyValuePair = reg.exec(queryString)) {
            parameters[keyValuePair[1]] = keyValuePair[2];
        }
    }

    return parameters;
}

/**
 * Adds a repeat event, but disables all forms affected by the module to start
 */
function gridAddRepeatingEventDisabled(ob) {    
    // Add repeat event as normal
    gridAddRepeatingEvent(ob);

    // Disable forms
    var cell, link;
    var newInstance = $(ob).attr('instance')*1 + 2;

    $('#event_grid_table > tbody > tr').each(function(){  
        // Find cell
        link = $('td:eq(' + newInstance +') > a', this);
        if (link.length > 1) {
            var params = getQueryParameters(link.attr('href'),link.attr('onclick'));
            params.id = params.id.replace(/\+/g,' ');
            if (formRenderSkipLogic.formsAccess[params.id][params.event_id][params.page]) {
                try {
                    cell.css('pointer-events', 'none');
                    cell.find('a').css('opacity', '.1');
                } catch (err) {
                    console.log(err);
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    var $links;

    switch (formRenderSkipLogic.location) {
        case 'data_entry_form':
            overrideNextFormButtonsRedirect();
            $links = $('.formMenuList a');
            break;
        case 'record_home':
            overrideAddNewInstanceButton();
            $links = $('#event_grid_table a');
            break;
        case 'record_status_dashboard':
            $links = $('#record_status_table a');
            break;
    }

    if (typeof $links === 'undefined' || $links.length === 0) {
        return false;
    }

    $links.each(function() {
        if (this.href != "javascript:;" && 
            this.href.indexOf(app_path_webroot + 'DataEntry/index.php?') === -1) {
            return;
        }

        var params = getQueryParameters(this.href,this.getAttribute('onclick'));
        if(formRenderSkipLogic.location == 'record_home') {
            params.id = params.id.replace(/\+/g,' ');
        }
        try {
            
            var instance = 1;

            if(params.instance) {
                var instance = params.instance;
            }

            if (!formRenderSkipLogic.formsAccess[params.id][params.event_id][params.page][instance] && 
                !formRenderSkipLogic.formsAccess[params.id][params.event_id][params.page]['all']) {
                disableForm(this);
            }
        } catch (err) {
            if (this.firstChild.getAttribute('title') === 'Delete this event') {
                // on record home the final row is "delete all data on event" buttons and should not be processed
                return;
            }
        }
    });

    /**
     * Overrides next form buttons to redirect to the next available step.
     */
    function overrideNextFormButtonsRedirect() {
        // Handling "Save & Go to Next Form" button.
        if (formRenderSkipLogic.nextStepPath) {
            formRenderSkipLogic.saveNextForm = function() {
                appendHiddenInputToForm('save-and-redirect', formRenderSkipLogic.nextStepPath);
                dataEntrySubmit('submit-btn-savecontinue');
                return false;
            }

            // Overriding submit callback.
            $('[id="submit-btn-savenextform"]').attr('onclick', 'formRenderSkipLogic.saveNextForm()');
        }
        else {
            removeButtons('savenextform');
        }

        // Handling "Ignore and go to next form" button on required fields
        // dialog.
        $('#reqPopup').on('dialogopen', function(event, ui) {
            var buttons = $(this).dialog('option', 'buttons');

            $.each(buttons, function(i, button) {
                if (button.name !== 'Ignore and go to next form') {
                    return;
                }

                if (formRenderSkipLogic.nextStepPath) {
                    buttons[i] = function() {
                        window.location.href = formRenderSkipLogic.nextStepPath;
                    };
                }
                else {
                    delete buttons[i];
                }

                return false;
            });

            $(this).dialog('option', 'buttons', buttons);
        });
    }

    /**
     * Adds a repeat event, but disables all forms affected by the module to start
     */
    function gridAddRepeatingEventDisabled(ob) {    
        // Add repeat event as normal
        gridAddRepeatingEvent(ob);

        // Disable forms

        var cell;

        // Get current instance
        var newInstance = $(ob).attr('instance')*1 + 2;

        $('#event_grid_table > tbody > tr').each(function(){  
            // Find cell
            cell = $('td:eq('+newInstance+')', this);
            try {
                disableForm(cell);
            } catch (err) {
                console.log(err);
            }
        });
    }

    /**
     * Overrides default functionality for adding repeat events
     */
    function overrideAddNewInstanceButton() {
        $('.btnAddRptEv').attr('onclick', 'gridAddRepeatingEventDisabled(this)');
    }

    /**
     * Disables a link to a form.
     */
    function disableForm(cell) {
        cell.style.pointerEvents = 'none';
        cell.style.opacity = '.1';
    }

    /**
     * Returns the query string of the given url string.
     */
    function getQueryString(url) {
        url = decodeURI(url);
        return url.match(/\?.+/)[0];
    }

    /**
     * Removes the given submit buttons set.
     */
    function removeButtons(buttonName) {
        var $buttons = $('button[name="submit-btn-' + buttonName + '"]');

        // Check if buttons are outside the dropdown menu.
        if ($buttons.length !== 0) {
            $.each($buttons, function(index, button) {
                // Get first button in dropdown-menu.
                var replacement = $(button).siblings('.dropdown-menu').find('a')[0];

                // Modify button to behave like $replacement.
                button.id = replacement.id;
                button.name = replacement.name;
                button.onclick = replacement.onclick;
                button.innerHTML = replacement.innerHTML;

                // Get rid of replacement.
                $(replacement).remove();
            });
        }
        else {
            // Disable button inside the dropdown menu.
            // Obs.: yes, this is a weird selector - "#" prefix is not being
            // used - but this approach is needed on this page because there
            // are multiple DOM elements with the same ID - which is
            // totally wrong.
            $('a[id="submit-btn-' + buttonName + '"]').hide();
        }
    }
});