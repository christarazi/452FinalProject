if (window.location.href.search("login")) {
	$('li', $("#tabs")).each(function () {
		$(this).removeClass("active");
	});
	$("#loginTab").addClass('active');
}
