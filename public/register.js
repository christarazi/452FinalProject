if (window.location.href.search("register")) {
	$('li', $("#tabs")).each(function () {
		$(this).removeClass("active");
	});
	$("#registerTab").addClass('active');
}